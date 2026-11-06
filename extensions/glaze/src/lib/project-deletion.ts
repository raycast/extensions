import type { GlazeApp } from "./types";

export function getProjectDeletion(project: GlazeApp) {
  const bundleOnly = project.path === project.bundlePath;
  const name = project.displayName || project.name;
  return {
    title: bundleOnly ? "Delete App Bundle" : "Delete Project",
    message: bundleOnly
      ? `Are you sure you want to delete the app bundle for "${name}"? Only the app bundle will move to Trash. Linked project files will remain on disk.`
      : `Are you sure you want to delete "${name}"? The project and app bundle will move to Trash.`,
    paths: [
      project.path,
      ...(project.bundlePath && !bundleOnly ? [project.bundlePath] : []),
    ],
    successTitle: bundleOnly ? "App bundle deleted" : "Project deleted",
    failureTitle: bundleOnly
      ? "Failed to delete app bundle"
      : "Failed to delete project",
  };
}
