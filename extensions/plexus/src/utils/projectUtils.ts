import { readFileSync } from "fs";
import { join, dirname } from "path";

export function detectFramework(cmdResult: string): string {
  const frameworks = [
    { pattern: "vite", name: "Vite" },
    { pattern: "next", name: "Next.js" },
    { pattern: "react-scripts", name: "Create React App" },
    { pattern: "webpack", name: "Webpack Dev Server" },
    { pattern: "express", name: "Express" },
    { pattern: "nodemon", name: "Nodemon" },
  ];

  for (const framework of frameworks) {
    if (cmdResult.includes(framework.pattern)) {
      return framework.name;
    }
  }

  return "";
}

export function getProjectName(projectPath: string): string {
  if (!projectPath) return "Node.js";

  try {
    const packageJsonPath = join(projectPath, "package.json");
    const packageContent = readFileSync(packageJsonPath, "utf-8");
    const packageData = JSON.parse(packageContent);

    if (packageData.name) return packageData.name;
  } catch {
    // If package.json reading fails, use directory name
  }

  // Fallback to directory name
  const dirName = projectPath.split("/").pop();
  return dirName && dirName !== "" && dirName !== "." ? dirName : "Node.js";
}

export function getProjectPath(cmdResult: string): string {
  // Extract project path from command line
  const fullPath = cmdResult.match(/node\s+([^\s]+)/)?.[1];
  if (!fullPath) return "";
  const pathParts = fullPath.split("/");
  const nodeModulesIndex = pathParts.findIndex((part) => part === "node_modules");

  if (nodeModulesIndex > 0) {
    return pathParts.slice(0, nodeModulesIndex).join("/");
  }
  // If no node_modules found, use the directory of the file
  return dirname(fullPath);
}

export function createDisplayName(projectName: string, framework: string): string {
  if (!framework || framework === projectName) return projectName;
  if (projectName.toLowerCase().includes(framework.toLowerCase())) return projectName;

  return `${projectName} (${framework})`;
}
