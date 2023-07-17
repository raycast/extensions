import { prefs } from "./preferences";
import { mapToObject } from "../util/collections";
import { bodyOf, failIfNotOk, get } from "./api";
import { throwError } from "../util/log";
import { Response } from "node-fetch";
import { ObjectSpec } from "./objects";

export interface SfRecord {
  id: string;
  objectApiName: string;
  name: string;
  subtitle?: string;
  url: string;
}

export async function find(
  query: string,
  objectSpecs: ObjectSpec[],
  filterObjectName?: string
): Promise<SfRecord[] | undefined> {
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
