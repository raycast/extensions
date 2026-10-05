import { MRDiscussion, MergeRequest } from "../gitlabapi";

export function isDiscussionResolved(discussion: MRDiscussion): boolean {
  if (discussion.resolved === true) {
    return true;
  }
  const resolvableNotes = discussion.notes?.filter((note) => note.resolvable && !note.system) ?? [];
  if (resolvableNotes.length === 0) {
    return false;
  }
  return resolvableNotes.every((note) => note.resolved);
}

export function discussionLabelFromMergeRequest(mergeRequest: MergeRequest): string | undefined {
  if (
    mergeRequest.resolved_discussions_count === undefined ||
    mergeRequest.resolvable_discussions_count === undefined ||
    mergeRequest.resolvable_discussions_count <= 0
  ) {
    return undefined;
  }
  return `${mergeRequest.resolved_discussions_count}/${mergeRequest.resolvable_discussions_count}`;
}
