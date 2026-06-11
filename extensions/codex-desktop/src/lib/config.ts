import { environment } from "@raycast/api";
import path from "node:path";

export function extensionPaths() {
  const supportPath = environment.supportPath;
  const projectIconsPath = path.join(supportPath, "project-icons");

  return {
    supportPath,
    favoritesPath: path.join(supportPath, "favorite-projects.json"),
    projectIndexPath: path.join(supportPath, "project-index.json"),
    iconManifestPath: path.join(projectIconsPath, "manifest.json"),
    projectIconsPath,
  };
}
