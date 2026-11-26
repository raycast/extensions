import type { Taxonomy, TaxonomyOption } from "./taxonomy";
import { deleteRoleEverywhere } from "./collection-roles";
import { removeGenreEverywhere, removeStageEverywhere } from "./project-metadata";

// Manage Tags 里能删的三类标签。Role 只在合集里生效、按名字存；Stage / Genre 按 id 存。
export type TagKind = "stage" | "genre" | "role";

/** 从所有项目和曲目上去掉一个标签。Delete 和 Delete All 共用这一套清理。 */
export async function clearTagEverywhere(kind: TagKind, option: TaxonomyOption): Promise<void> {
  if (kind === "role") {
    await deleteRoleEverywhere(option.name);
  } else if (kind === "stage") {
    await removeStageEverywhere(option.id);
  } else {
    await removeGenreEverywhere(option.id);
  }
}

/**
 * 删光一张标签列表：逐个去掉项目和曲目上的引用，全部成功后才清空列表。
 * 顺序不能反：先清空列表的话，中途失败会留下「列表没了、标签还挂在项目上」的状态。
 * 现在这样失败时列表原样保留，用户再点一次 Delete All 就能接着删完（重复清引用是空操作）。
 */
export async function deleteAllTags(kind: TagKind, taxonomy: Taxonomy, options: TaxonomyOption[]): Promise<void> {
  for (const option of options) {
    await clearTagEverywhere(kind, option);
  }
  await taxonomy.save([]);
}
