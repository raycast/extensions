import { readFileSync } from "fs";
import { join, dirname, basename } from "path";

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

  // Fallback to directory name (OS-aware: handles both / and \ separators)
  const dirName = basename(projectPath);
  return dirName && dirName !== "" && dirName !== "." ? dirName : "Node.js";
}

// Extract the script-path argument from a command line. The node executable may be
// quoted and contain spaces (e.g. "C:\Program Files\nodejs\node.exe"), so we strip the
// first token (quoted or not) and return the next argument.
function extractScriptPath(cmdResult: string): string | null {
  let rest = cmdResult.trim();

  if (rest.startsWith('"')) {
    const end = rest.indexOf('"', 1);
    rest = end === -1 ? "" : rest.slice(end + 1).trim();
  } else {
    const sp = rest.indexOf(" ");
    rest = sp === -1 ? "" : rest.slice(sp + 1).trim();
  }

  if (!rest) return null;

  if (rest.startsWith('"')) {
    const end = rest.indexOf('"', 1);
    return end === -1 ? rest.slice(1) : rest.slice(1, end);
  }

  const sp = rest.indexOf(" ");
  return sp === -1 ? rest : rest.slice(0, sp);
}

export function getProjectPath(cmdResult: string): string {
  const scriptPath = extractScriptPath(cmdResult);
  if (!scriptPath) return "";

  // If the script lives inside node_modules (e.g. a framework binary), return the
  // project root: the part of the path before node_modules. Handles both / and \.
  const nodeModulesMatch = scriptPath.match(/^(.*?)[\\/]node_modules[\\/]/);
  if (nodeModulesMatch && nodeModulesMatch[1]) {
    return nodeModulesMatch[1];
  }

  // Otherwise, use the directory of the script being run (OS-aware).
  return dirname(scriptPath);
}

export function createDisplayName(projectName: string, framework: string): string {
  if (!framework || framework === projectName) return projectName;
  if (projectName.toLowerCase().includes(framework.toLowerCase())) return projectName;

  return `${projectName} (${framework})`;
}
