import type { Bookmark, Catalog } from "../model.ts";

/** Keep each category's manual order while reconciling membership changes. */
export function groupsWithMembers(catalog: Catalog, bookmarks: Bookmark[]) {
  return catalog.groups.map((group) => ({
    ...group,
    children: group.children.map((sub) => {
      const members = bookmarks
        .filter((bookmark) =>
          bookmark.locations.some(
            (location) =>
              location.groupId === group.id && location.subGroupId === sub.id,
          ),
        )
        .map((bookmark) => bookmark.id);
      const present = new Set(members);
      const ordered = (sub.bookmarkIds ?? []).filter((id) => present.has(id));
      const seen = new Set(ordered);
      return {
        ...sub,
        bookmarkIds: [...ordered, ...members.filter((id) => !seen.has(id))],
      };
    }),
  }));
}
