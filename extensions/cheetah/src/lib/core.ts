import { environment } from "@raycast/api";
import { Project, readCache } from "cheetah-core";
import { ResultItem } from "./types";

export async function output(projectList: Project[]): Promise<ResultItem[]> {
  const { editor } = await readCache();
  const result = projectList.map(
    ({ name, path, type, hits, idePath }: Project) => ({
      name,
      path,
      hits: hits.toString(),
      type,
      icon: `${environment.assetsPath}/type/${type}.png`,
      idePath: idePath || (editor?.[type] ?? ""),
    })
  );
  return result;
}
