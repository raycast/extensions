// How a result reaches the Eidos MD app (Raycast Extension REQ13): eidosmd://open names the project and one of its
// page's routes, and the app opens the project there.
export function openLink(root: string, route: string = "/"): string {
  const to = route === "/" ? "" : `&to=${encodeURIComponent(route)}`;
  return `eidosmd://open?project=${encodeURIComponent(root)}${to}`;
}

// A markdown link to a file of the project, as a blueprint links another: relative to the project.
export function markdownLink(title: string, file: string): string {
  return `[${title.replace(/([[\]])/g, "\\$1")}](${file.split("/").map(encodeURIComponent).join("/")})`;
}

export const DOWNLOAD_URL = "https://eidosmd.com/download";
