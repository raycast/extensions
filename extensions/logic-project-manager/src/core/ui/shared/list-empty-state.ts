/** 列表为空时显示什么：读不到数据要显示出错页面，不能看起来像空列表。 */
export type ListEmptyState = "loading" | "error" | "empty" | "list";

export function listEmptyState(isLoading: boolean, count: number, loadError: string | null): ListEmptyState {
  if (isLoading) return "loading";
  if (count > 0) return "list";
  return loadError === null ? "empty" : "error";
}
