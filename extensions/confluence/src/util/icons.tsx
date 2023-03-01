export function getContentIcon(type: string) {
  switch (type) {
    case "blogpost":
      return "blogpost-default.svg";
    case "page":
      return "page-default.svg";
    default:
      return "page-default.svg";
  }
}
