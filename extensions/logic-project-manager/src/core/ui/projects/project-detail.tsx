import { Color, List } from "@raycast/api";
import type { Project } from "@/core/projects/types";
import type { TaxonomyOption } from "@/core/metadata/taxonomy";
import type { ProjectFilesInfo } from "@/daws/types";
import type { CurrentSetInfo } from "@/core/ui/projects/current-sets-state";
import type { DetailDoc } from "@/core/ui/hooks/use-detail-view";
import { displayDoc } from "@/core/docs/docs";
import { docPlaceholder } from "@/core/docs/doc-actions";
import { formatDate } from "@/core/ui/shared/format";
import { labels } from "@/daws/labels";
import { strings } from "@/strings";

/** 项目行的右侧详情面板：笔记 / 歌词作 markdown 主体，其余作 metadata。
 *  只负责渲染，标签名、工程文件信息、current Set 都由调用方算好传进来。 */
export function ProjectDetail({
  project,
  detailDoc,
  missingDocFolder,
  stage,
  genreNames,
  collectionNames,
  files,
  current,
}: {
  project: Project;
  detailDoc: DetailDoc;
  /** 该类文档的自定义文件夹失效时的路径；由调用方预计算，这里不查磁盘。 */
  missingDocFolder: string | null;
  stage: TaxonomyOption | undefined;
  genreNames: string[];
  collectionNames: string[];
  files: ProjectFilesInfo | null;
  current: CurrentSetInfo | undefined;
}) {
  const detailBody = detailDoc === "notes" ? project.notes : project.lyrics;
  const detailPlaceholder = docPlaceholder(detailDoc, project.title, missingDocFolder);
  const currentBpm = current?.metadata?.bpm ?? null;

  return (
    <List.Item.Detail
      markdown={detailBody.trim() ? displayDoc(detailBody) : detailPlaceholder}
      metadata={
        <List.Item.Detail.Metadata>
          {stage ? (
            <List.Item.Detail.Metadata.TagList title={strings.stage}>
              <List.Item.Detail.Metadata.TagList.Item text={stage.name} color={stage.color ?? Color.SecondaryText} />
            </List.Item.Detail.Metadata.TagList>
          ) : (
            <List.Item.Detail.Metadata.Label title={strings.stage} text="" />
          )}
          {genreNames.length > 0 ? (
            <List.Item.Detail.Metadata.TagList title={strings.genre}>
              {genreNames.map((genreName) => (
                <List.Item.Detail.Metadata.TagList.Item key={genreName} text={genreName} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          ) : (
            <List.Item.Detail.Metadata.Label title={strings.genre} text="" />
          )}
          {collectionNames.length > 0 ? (
            <List.Item.Detail.Metadata.TagList title={strings.collection}>
              {collectionNames.map((collectionName) => (
                <List.Item.Detail.Metadata.TagList.Item key={collectionName} text={collectionName} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          ) : (
            <List.Item.Detail.Metadata.Label title={strings.collection} text="" />
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title={strings.bounces} text={String(project.bouncesCount)} />
          {files ? (
            <List.Item.Detail.Metadata.Label title={files.labels.projectFiles} text={String(files.count)} />
          ) : (
            <List.Item.Detail.Metadata.Label title={labels.sets} text={String(project.setsCount)} />
          )}
          <List.Item.Detail.Metadata.Separator />
          {files ? (
            <List.Item.Detail.Metadata.Label
              title={files.labels.latestProjectFile}
              text={current ? files.latestName(current.set.path) : ""}
            />
          ) : (
            <List.Item.Detail.Metadata.Label title={labels.currentSet} text={current?.set.name ?? ""} />
          )}
          <List.Item.Detail.Metadata.Label title={strings.key} text={current?.metadata?.key ?? ""} />
          <List.Item.Detail.Metadata.Label title={strings.bpm} text={currentBpm === null ? "" : String(currentBpm)} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title={strings.created} text={formatDate(project.createdAt)} />
          <List.Item.Detail.Metadata.Label title={strings.modified} text={formatDate(project.modifiedAt)} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
