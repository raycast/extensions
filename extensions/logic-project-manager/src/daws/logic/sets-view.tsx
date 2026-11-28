import path from "node:path";
import type { Project } from "@/core/projects/types";
import type { ProjectFilesInfo } from "@/daws/types";
import { PACKAGE_EXTENSION } from "./adapter";
import { projectFilesViewStrings } from "./strings";
import { AlternativesView } from "./alternatives-view";
import { ProjectFilesView } from "./project-files-view";

/** Search Projects 用：文件夹形态的项目有「工程文件」这一层，Package 没有。
 *  个数在加载项目时由 adapter 的 countProjectFiles 算好，这里只读字段，不碰磁盘。 */
export function projectFilesInfo(project: Pick<Project, "projectFilesCount">): ProjectFilesInfo | null {
  // 旧版列表缓存里没有这个字段，读到 undefined 时按没有这一层处理，等扫描完再显示。
  const count = project.projectFilesCount ?? null;
  if (count === null) return null;
  return {
    count,
    // Logic 的 Set 路径就是 .logicx 包的路径。
    latestName: (currentSetPath) => path.basename(currentSetPath, PACKAGE_EXTENSION),
    labels: projectFilesViewStrings,
  };
}

// 共用代码的 SetsView 入口：文件夹形态的项目先列出里面的 .logicx（只有一个也一样），Package 直接进 Alternatives。
export function LogicSetsView({ project }: { project: Project }) {
  return project.kind === "folder" ? <ProjectFilesView project={project} /> : <AlternativesView project={project} />;
}
