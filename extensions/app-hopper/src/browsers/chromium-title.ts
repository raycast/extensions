/** Display-only decoding of Chromium AX labels. Keep the raw title for search and focus. */
export function describeChromiumTabTitle(rawTitle: string) {
  // Chromium's IDS_TAB_AX_LABEL_PINNED_FORMAT / IDS_TAB_AX_LABEL_NAMED_GROUP_FORMAT.
  // Recognize verified English and Traditional Chinese formats; leave other formats intact.
  const pinnedSuffix = / - (?:Pinned|已固定)$/;
  const pinned = pinnedSuffix.test(rawTitle);
  const title = rawTitle.replace(pinnedSuffix, "");
  const group = /^(.*) - 屬於「(.+)」群組$/.exec(title) ?? /^(.*) - Part of group (.+)$/.exec(title);
  return { title: group?.[1] || title, group: group?.[2], pinned };
}
