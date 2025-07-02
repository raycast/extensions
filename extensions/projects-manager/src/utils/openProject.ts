import fs from "fs";
import path from "path";
import { open } from "@raycast/api";
import Project from "../types/project";

export function handleOpenProject(project: Project) {
  // Note: categories array needs to be passed as parameter or imported
  const categories: { name: string; defaultAppPath: string }[] = []; // Placeholder - this function needs proper categories data
  const category = categories.find((c) => c.name === project.categoryName);
  if (!category) return;

  function findXcodeProject(dirPath: string): string | null {
    const files = fs.readdirSync(dirPath);

    // First check current directory for workspace files
    const workspaceFile = files.find((file) => file.endsWith(".xcworkspace"));
    if (workspaceFile) {
      return path.join(dirPath, workspaceFile);
    }

    // Then check for project files
    const projectFile = files.find((file) => file.endsWith(".xcodeproj"));
    if (projectFile) {
      return path.join(dirPath, projectFile);
    }

    // Recursively check subdirectories
    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      if (fs.statSync(fullPath).isDirectory()) {
        const found = findXcodeProject(fullPath);
        if (found) return found;
      }
    }

    return null;
  }
  if (category.name == "SwiftUI") {
    const xcodePath = findXcodeProject(project.fullPath);
    if (xcodePath) {
      console.log("xcodePath", xcodePath);
      open(xcodePath, category.defaultAppPath);
    }
  } else {
    open(project.fullPath, category.defaultAppPath);
  }
}
