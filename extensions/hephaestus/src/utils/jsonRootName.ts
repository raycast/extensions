export function jsonRootName(jsonValue: string): string {
  try {
    const jsonObject = JSON.parse(jsonValue);
    const rootName = Object.keys(jsonObject)[0];
    const typeName = rootName.charAt(0).toUpperCase() + rootName.slice(1);
    return typeName;
  } catch (error) {
    return "Root";
  }
}
