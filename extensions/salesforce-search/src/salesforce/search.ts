import { prefs } from "./preferences";
import { filterDefined, mapToObject } from "../util/collections";
import { bodyOf, failIfNotOk, get } from "./api";
import { showError, throwError } from "../util/log";
import { Response } from "node-fetch";

export interface SfObject {
  category: "record" | "reporting";
  apiName: string;
  label: string;
  labelPlural: string;
  iconUrl: string;
  iconColor: string;
}

export interface SfRecord {
  id: string;
  objectApiName: string;
  name: string;
  subtitle?: string;
  url: string;
}

interface ObjectSpec {
  apiName: string;
  nameField: string;
  subtitleField?: string;
  dynamicMetadata: boolean;
}

const objectSpecs = [
  ...parseObjectSpecs(["Account", "Contact(Name,Account.Name)", "Opportunity"]),
  ...parseObjectSpecs(["Dashboard(Title)", "Report"], false),
  ...(prefs.additionalObjects ? parseSemicolonSeparatedObjectSpecs(prefs.additionalObjects) : []),
];
const reportingObjects: SfObject[] = [
  {
    category: "reporting",
    apiName: "Dashboard",
    label: "Dashboard",
    labelPlural: "Dashboards",
    iconUrl: `https://${prefs.domain}.my.salesforce.com/img/icon/t4v35/standard/dashboard_120.png`,
    iconColor: "db7368",
  },
  {
    category: "reporting",
    apiName: "Report",
    label: "Report",
    labelPlural: "Reports",
    iconUrl: `https://${prefs.domain}.my.salesforce.com/img/icon/t4v35/standard/report_120.png`,
    iconColor: "64c8be",
  },
];

function parseObjectSpec(objectSpec: string, dynamicMetadata = true): ObjectSpec | undefined {
  const pattern = /^(?<apiName>[a-zA-Z_]+)(?:\((?<nameField>[a-zA-Z_.]+)(?: *, *(?<subtitleField>[a-zA-Z_.]+))?\))?$/;
  const match = pattern.exec(objectSpec);
  if (!match || !match.groups) {
    showError(`Ignored invalid object specification '${objectSpec}'`, "See documentation for exact syntax");
    return undefined;
  } else {
    return {
      apiName: match.groups.apiName,
      nameField: match.groups.nameField ?? "Name",
      subtitleField: match.groups.subtitleField,
      dynamicMetadata,
    };
  }
}

function parseObjectSpecs(objectSpecs: string[], dynamicMetadata = true): ObjectSpec[] {
  return filterDefined(objectSpecs.map((os) => parseObjectSpec(os, dynamicMetadata)));
}

function parseSemicolonSeparatedObjectSpecs(objectSpecs: string, dynamicMetadata = true): ObjectSpec[] {
  const specs = objectSpecs
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return parseObjectSpecs(specs, dynamicMetadata);
}

export async function getObjects(): Promise<SfObject[]> {
  interface Result {
    results: {
      statusCode: number;
      result: {
        apiName: string;
        label: string;
        labelPlural: string;
        themeInfo: {
          iconUrl: string;
          color: string;
        };
      };
    }[];
  }

  const failForUnknownObjects = (results: Result["results"], objNames: string[]) => {
    const failedIndex = results.findIndex((r) => r.statusCode > 200);
    if (failedIndex >= 0) {
      throwError(`Cannot fetch metadata for object type '${objNames[failedIndex]}'`);
    }
  };
  const objectsFromResult = (results: Result["results"]) => {
    return results.map(
      (r) =>
        ({
          category: "record",
          apiName: r.result.apiName,
          label: r.result.label,
          labelPlural: r.result.labelPlural,
          iconUrl: r.result.themeInfo.iconUrl,
          iconColor: r.result.themeInfo.color,
        } as SfObject)
    );
  };

  const objNames = objectSpecs.filter((o) => o.dynamicMetadata).map((o) => o.apiName);
  const objNameList = objNames.join(",");
  const response = await get(`/services/data/v54.0/ui-api/object-info/batch/${objNameList}`);
  await failIfNotOk(response, "Fetching metadata");
  const result = await bodyOf<Result>(response);
  failForUnknownObjects(result.results, objNames);
  const dynamicObjects = objectsFromResult(result.results);
  return [...dynamicObjects, ...reportingObjects];
}

export async function find(query: string, filterObjectName?: string): Promise<SfRecord[] | undefined> {
  type FieldPathsByObject = { [p: string]: { nameField: string; subtitleField?: string } };

  interface Result {
    searchRecords: {
      attributes: {
        type: string;
      };
      Id: string;
    }[];
  }

  const minQueryLength = 3;
  const filterObjectSpecs = (specs: ObjectSpec[], filterName?: string) => {
    return filterName ? specs.filter((s) => s.apiName === filterName) : specs;
  };
  const buildFieldPathsByObject = (specs: ObjectSpec[]) => {
    return mapToObject(
      specs,
      (item) => item.apiName,
      (item) => ({ nameField: item.nameField, subtitleField: item.subtitleField })
    );
  };
  const buildFieldSpec = (os: ObjectSpec) => {
    const fields = ["id", os.nameField, os.subtitleField].filter((f) => f);
    return `${os.apiName}(${fields.join(", ")})`;
  };
  const failOnError = async (response: Response) => {
    if (response.status === 400 && (await response.text()).includes("INVALID_FIELD")) {
      throwError("Specified custom field doesn't exist.", "Fix you custom object syntax!");
    } else {
      await failIfNotOk(response, "Search");
    }
  };
  const buildObjects = async (response: Response, fieldPathsByObject: FieldPathsByObject) => {
    const result = await bodyOf<Result>(response);
    return result.searchRecords.map(
      (r) =>
        ({
          id: r.Id,
          objectApiName: r.attributes.type,
          name: propAtPath(r, fieldPathsByObject[r.attributes.type].nameField),
          subtitle: propAtPath(r, fieldPathsByObject[r.attributes.type].subtitleField),
          url: `https://${prefs.domain}.lightning.force.com/lightning/r/${r.attributes.type}/${r.Id}/view`,
        } as SfRecord)
    );
  };

  if (query.length < minQueryLength) return [];
  const filteredObjectSpecs = filterObjectSpecs(objectSpecs, filterObjectName);
  const fieldPathsByObject = buildFieldPathsByObject(filteredObjectSpecs);
  const objFieldList = filteredObjectSpecs.map(buildFieldSpec).join(", ");
  const q = `FIND {${sanitizeSoslQuery(query)}} IN ALL FIELDS RETURNING ${objFieldList} LIMIT 20`;
  const response = await get("/services/data/v55.0/search/", { q });
  await failOnError(response);
  return buildObjects(response, fieldPathsByObject);
}

function sanitizeSoslQuery(query: string): string {
  return query.replaceAll(/([?&|!{}[\]()^~*:\\"'+-])/g, "\\$1");
}

type NestedStringMap = { [key in string]: string | NestedStringMap };

function propAtPath(object: NestedStringMap, path?: string): string | NestedStringMap | undefined {
  if (!path) return undefined;
  const pathSegments = path.split(".");
  const reducer = (prev: NestedStringMap | string | undefined, prop: string) => {
    switch (typeof prev) {
      case "object":
        return prev[prop] ?? undefined;
      default:
        return prev;
    }
  };
  return pathSegments?.reduce(reducer, object);
}
