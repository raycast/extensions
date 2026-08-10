// utils.tsx
export const stripHtmlTags = (html: string): string => {
  const regex = /(<([^>]+)>)/gi;
  return html.replace(regex, "");
};
