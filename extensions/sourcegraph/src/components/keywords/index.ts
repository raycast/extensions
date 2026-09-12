// propsToKeywords converts the given key-value pairs to searchable keywords in the format
// of 'key:value'.
export function propsToKeywords(props: { [key: string]: string | undefined }): string[] {
  const keywords: string[] = [];
  Object.keys(props).forEach((key) => {
    if (key) {
      keywords.push(`${key}:${props[key]}`);
    }
  });
  return keywords;
}
