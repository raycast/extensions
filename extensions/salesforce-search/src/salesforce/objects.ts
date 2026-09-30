import { showError, throwError } from "../util/log";
import { filterDefined } from "../util/collections";
import { bodyOf, failIfNotOk, get } from "./api";

export interface SfObject {
  category: "record" | "reporting";
  apiName: string;
  label: string;
  labelPlural: string;
  iconUrl: string;
  iconColor: string;
}

export interface ObjectSpec {
  apiName: string;
  nameField: string;
  subtitleField?: string;
  dynamicMetadata: boolean;
}

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

export function parseObjectSpecs(objectSpecs: string[], dynamicMetadata = true): ObjectSpec[] {
  return filterDefined(objectSpecs.map((os) => parseObjectSpec(os, dynamicMetadata)));
}

export function parseSemicolonSeparatedObjectSpecs(objectSpecs: string, dynamicMetadata = true): ObjectSpec[] {
  const specs = objectSpecs
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return parseObjectSpecs(specs, dynamicMetadata);
}

export async function fetchObjectMetadata(objectSpecs: ObjectSpec[]): Promise<SfObject[]> {
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
  return [...dynamicObjects];
}
