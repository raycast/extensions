import { Color, Icon, type List } from "@raycast/api";
import { strings } from "@/strings";
import type { Project } from "@/core/projects/types";
import type { TaxonomyOption } from "@/core/metadata/taxonomy";
import type { ProjectFilesInfo } from "@/daws/types";

/** 项目行的 accessories：Stage → 工程文件数（或 Set 数）→ Bounce 数。
 *  纯函数，不读磁盘、不碰状态，方便单测。Detail 打开时由调用方传空数组。 */
export function projectAccessories({
  project,
  stage,
  files,
  setsLabel,
}: {
  project: Project;
  stage: TaxonomyOption | undefined;
  files: ProjectFilesInfo | null;
  /** Set 的界面叫法（labels.sets），由调用方传入，避免这里依赖 DAW 专属文案。 */
  setsLabel: string;
}): List.Item.Accessory[] {
  const stagePill = stage ? [{ tag: { value: stage.name, color: stage.color ?? Color.SecondaryText } }] : [];
  const countAccessories = files
    ? [
        { text: String(files.count), tooltip: `${files.count} ${files.labels.projectFiles}` },
        { icon: "package.png", tooltip: `${files.count} ${files.labels.projectFiles}` },
      ]
    : [
        { text: String(project.setsCount), tooltip: `${project.setsCount} ${setsLabel}` },
        { icon: Icon.Document, tooltip: `${project.setsCount} ${setsLabel}` },
      ];
  return [
    ...stagePill,
    ...countAccessories,
    { text: String(project.bouncesCount), tooltip: `${project.bouncesCount} ${strings.bounces}` },
    { icon: Icon.Waveform, tooltip: `${project.bouncesCount} ${strings.bounces}` },
  ];
}
