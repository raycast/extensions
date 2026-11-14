/**
 * Page prefill policy: fill a field only while the user has not touched it.
 * `appliedLink` is the value the form itself wrote earlier, so a later page
 * read may replace it, but never a link the user typed.
 */
export function prefill(
  current: { link: string; title: string },
  appliedLink: string | undefined,
  page: { url: string; title: string },
  touched: { link?: boolean; title?: boolean } = {},
) {
  if (touched.link || (current.link && current.link !== appliedLink)) return {};
  return {
    ...(page.url ? { link: page.url } : {}),
    ...(page.title && !current.title && !touched.title ? { title: page.title } : {}),
  };
}
