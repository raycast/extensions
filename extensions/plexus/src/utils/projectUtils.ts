import { readFileSync } from "fs";
import { join, dirname, basename } from "path";

export function detectFramework(cmdResult: string): string {
  // Order matters: more specific markers (e.g. artisan) win over generic ones (php).
  const frameworks = [
    { pattern: "artisan", name: "Laravel" },
    { pattern: "vite", name: "Vite" },
    { pattern: "next", name: "Next.js" },
    { pattern: "nuxt", name: "Nuxt" },
    { pattern: "react-scripts", name: "Create React App" },
    { pattern: "webpack", name: "Webpack Dev Server" },
    { pattern: "express", name: "Express" },
    { pattern: "nodemon", name: "Nodemon" },
    { pattern: "manage.py", name: "Django" },
    { pattern: "flask", name: "Flask" },
    { pattern: "uvicorn", name: "Uvicorn" },
    { pattern: "gunicorn", name: "Gunicorn" },
    { pattern: "rails", name: "Rails" },
    { pattern: "php-cgi", name: "PHP" },
    { pattern: "php", name: "PHP" },
    { pattern: "nginx", name: "Nginx" },
  ];

  for (const framework of frameworks) {
    if (cmdResult.includes(framework.pattern)) {
      return framework.name;
    }
  }

  return "";
}

export function getProjectName(projectPath: string): string {
  // Only trust absolute paths (Unix "/", Windows "C:\", or "\\wsl.localhost\..." UNC).
  // A relative value like "." would make readFileSync pick up the current dir's package.json.
  const isAbsolute = /^([a-zA-Z]:[\\/]|\\\\|\/)/.test(projectPath);
  if (!projectPath || !isAbsolute) return "Localhost";

  try {
    const packageJsonPath = join(projectPath, "package.json");
    const packageContent = readFileSync(packageJsonPath, "utf-8");
    const packageData = JSON.parse(packageContent);

    if (packageData.name) return packageData.name;
  } catch {
    // If package.json reading fails, use directory name
  }

  // Fallback to directory name (OS-aware: handles both / and \ separators).
  // If the server is served from a common web root (e.g. Laravel's public/), use the
  // parent folder so we show the project name ("knaker-api") rather than "public".
  const webRoots = new Set(["public", "public_html", "web", "dist", "build", "html", "wwwroot"]);
  let dirName = basename(projectPath);
  if (webRoots.has(dirName.toLowerCase())) {
    const parent = basename(dirname(projectPath));
    if (parent && parent !== ".") dirName = parent;
  }
  return dirName && dirName !== "" && dirName !== "." ? dirName : "Localhost";
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
  const dir = dirname(scriptPath);
  return dir === "." ? "" : dir;
}

export function createDisplayName(projectName: string, framework: string): string {
  if (!framework || framework === projectName) return projectName;
  if (projectName.toLowerCase().includes(framework.toLowerCase())) return projectName;

  return `${projectName} (${framework})`;
}
