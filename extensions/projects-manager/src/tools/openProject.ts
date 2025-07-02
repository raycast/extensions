import fs from "fs";
import path from "path";
import { LocalStorage } from "@raycast/api";
import Project from "../types/project";
import { open } from "@raycast/api";

type Input = {
  /**
   * This is the project to open. Use the getAllProjects tool to get a list of projects. If no project name is provided, ask the user which project they would like to open.
   */
  project: Project;
};

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

function checkIfXcodePackage(dirPath: string): boolean {
  const files = fs.readdirSync(dirPath);
  return files.some((file) => file === "Package.swift");
}

function checkIfSkip(dirPath: string): boolean {
  const files = fs.readdirSync(dirPath);
  return files.some((file) => file === "Skip.env");
}

function checkIfRaycastProject(dirPath: string): boolean {
  const files = fs.readdirSync(dirPath);
  return files.some((file) => file === "raycast-env.d.ts");
}

export default async function openProject(input: Input) {
  let categories = await LocalStorage.getItem<string>("categories");
  categories = JSON.parse(categories || "[]");
  const category = categories.find((c) => c.name === input.project.categoryName);
  if (!category) return;

  const lastOpenedTimes = JSON.parse((await LocalStorage.getItem("lastOpenedTimes")) || "{}") as Record<string, number>;
  lastOpenedTimes[input.project.fullPath] = Date.now();
  await LocalStorage.setItem("lastOpenedTimes", JSON.stringify(lastOpenedTimes));

  if (checkIfRaycastProject(input.project.fullPath)) {
    open(input.project.fullPath, category.defaultAppPath);
  } else if (checkIfSkip(input.project.fullPath)) {
    const xcodePath = findXcodeProject(input.project.fullPath + "/Darwin");
    if (xcodePath) {
      open(xcodePath, category.defaultAppPath);
    }
  } else {
    console.log(category.defaultAppPath);
    if (category.defaultAppPath.includes("Xcode")) {
      if (checkIfXcodePackage(input.project.fullPath)) {
        open(input.project.fullPath, category.defaultAppPath);
      } else {
        if (findXcodeProject(input.project.fullPath) != null) {
          const xcodePath = findXcodeProject(input.project.fullPath);
          open(xcodePath, category.defaultAppPath);
        } else {
          open(input.project.fullPath, category.defaultAppPath);
        }
      }
    } else {
      open(input.project.fullPath, category.defaultAppPath);
    }
  }
}
