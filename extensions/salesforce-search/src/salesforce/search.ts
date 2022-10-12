import { prefs } from "./preferences";
import { mapToObject } from "../util/collections";
import { get } from "./api";

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
  subtitleField: string;
  dynamicMetadata: boolean;
}

const objectSpecs = [
  ...parseObjectSpecs(["Account", "Contact(Name,Account.Name)", "Opportunity"]),
  ...parseObjectSpecs(["Dashboard(Title)", "Report"], false),
  ...parseSemicolonSeparatedObjectSpecs(prefs.additionalObjects as string),
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

function parseObjectSpec(objectSpec: string, dynamicMetadata = true): ObjectSpec {
  const pattern = /^(?<apiName>[a-zA-Z_]+)(?:\((?<nameField>[a-zA-Z_.]+)(?: *, *(?<subtitleField>[a-zA-Z_.]+))?\))?$/;
  const match = pattern.exec(objectSpec);
  if (!match || !match.groups) {
    throw Error(`Invalid object specification '${objectSpec}'. See documentation for details.`);
  }
  return {
    apiName: match.groups.apiName,
    nameField: match.groups.nameField ?? "Name",
    subtitleField: match.groups.subtitleField,
    dynamicMetadata,
  };
}

function parseObjectSpecs(objectSpecs: string[], dynamicMetadata = true): ObjectSpec[] {
  return objectSpecs.map((os) => parseObjectSpec(os, dynamicMetadata));
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

  const objNames = objectSpecs
    .filter((o) => o.dynamicMetadata)
    .map((o) => o.apiName)
    .join(",");
  const result = await get<Result>(`/services/data/v54.0/ui-api/object-info/batch/${objNames}`);
  const dynamicObjects = result.results.map(
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
  return [...dynamicObjects, ...reportingObjects];
}

export async function find(query: string, filterObjectName?: string): Promise<SfRecord[]> {
  interface Result {
    searchRecords: {
      attributes: {
        type: string;
      };
      Id: string;
    }[];
  }

  if (query.length < 3) return [];
  const filteredObjectSpecs = filterObjectName
    ? objectSpecs.filter((os) => os.apiName === filterObjectName)
    : objectSpecs;
  const fieldPathByObject = mapToObject(
    filteredObjectSpecs,
    (item) => item.apiName,
    (item) => ({ nameField: item.nameField, subtitleField: item.subtitleField })
  );
  const fieldSpec = (os: ObjectSpec) => {
    const fields = ["id", os.nameField, os.subtitleField].filter((f) => f);
    return `${os.apiName}(${fields.join(", ")})`;
  };
  const objFields = filteredObjectSpecs.map(fieldSpec).join(", ");
  const q = `FIND {${sanitizeSoslQuery(query)}} IN ALL FIELDS RETURNING ${objFields} LIMIT 20`;
  const records = await get<Result>("/services/data/v55.0/search/", { q });
  return records.searchRecords.map(
    (r) =>
      ({
        id: r.Id,
        objectApiName: r.attributes.type,
        name: propAtPath(r, fieldPathByObject[r.attributes.type].nameField),
        subtitle: propAtPath(r, fieldPathByObject[r.attributes.type].subtitleField),
        url: `https://${prefs.domain}.lightning.force.com/lightning/r/${r.attributes.type}/${r.Id}/view`,
      } as SfRecord)
  );
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
        return prev[prop];
      default:
        return prev;
    }
  };
  return pathSegments?.reduce(reducer, object);
}
