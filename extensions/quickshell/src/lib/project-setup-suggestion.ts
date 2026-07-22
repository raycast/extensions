import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

export type WorkspaceSetupTask = {
  label: string;
  command: string;
};

const PREFERRED_SCRIPT_NAMES = ["dev", "start", "test", "build"];

export function buildProjectSetupSuggestions(directory: string): WorkspaceSetupTask[] {
  if (!directory.trim() || !existsSync(directory)) {
    return [];
  }

  const tasks: WorkspaceSetupTask[] = [];
  const seenCommands = new Set<string>();
  const seenLabels = new Set<string>();

  const add = (label: string, command: string) => {
    const normalized = command.trim();
    if (!normalized || seenCommands.has(normalized.toLowerCase())) {
      return;
    }
    seenCommands.add(normalized.toLowerCase());

    let uniqueLabel = disambiguateSuggestionLabel(label, normalized);
    uniqueLabel = ensureUniqueSuggestionLabel(uniqueLabel, seenLabels);
    seenLabels.add(uniqueLabel.toLowerCase());
    tasks.push({ label: uniqueLabel, command: normalized });
  };

  addNodeSuggestions(directory, add);
  addDotNetSuggestions(directory, add);
  addGoSuggestions(directory, add);
  addDockerSuggestions(directory, add);
  addPythonSuggestions(directory, add);

  return tasks;
}

function addNodeSuggestions(directory: string, add: (label: string, command: string) => void) {
  const packageJsonPath = path.join(directory, "package.json");
  if (!existsSync(packageJsonPath)) {
    return;
  }

  try {
    const parsed = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      scripts?: Record<string, string>;
    };
    const scripts = parsed.scripts ?? {};
    for (const scriptName of PREFERRED_SCRIPT_NAMES) {
      if (scripts[scriptName]) {
        add(toTitle(scriptName), `npm run ${scriptName}`);
      }
    }
  } catch {
    // ignore invalid package.json
  }
}

function addDotNetSuggestions(directory: string, add: (label: string, command: string) => void) {
  const csprojs = findFiles(directory, ".csproj", 2);
  if (csprojs.length === 0) {
    return;
  }

  add("Build", "dotnet build");
  add("Tests", "dotnet test");
  if (csprojs.length === 1) {
    const project = quoteIfNeeded(csprojs[0]);
    add("Watch", `dotnet watch --project ${project}`);
    add("Run", `dotnet run --project ${project}`);
  } else {
    add("Watch", "dotnet watch");
  }
}

function addGoSuggestions(directory: string, add: (label: string, command: string) => void) {
  if (!existsSync(path.join(directory, "go.mod"))) {
    return;
  }
  add("Run", "go run .");
  add("Tests", "go test ./...");
}

function addDockerSuggestions(directory: string, add: (label: string, command: string) => void) {
  if (
    !existsSync(path.join(directory, "docker-compose.yml")) &&
    !existsSync(path.join(directory, "docker-compose.yaml")) &&
    !existsSync(path.join(directory, "compose.yml")) &&
    !existsSync(path.join(directory, "compose.yaml"))
  ) {
    return;
  }
  add("Docker up", "docker compose up");
}

function addPythonSuggestions(directory: string, add: (label: string, command: string) => void) {
  if (existsSync(path.join(directory, "manage.py"))) {
    add("Run", "python manage.py runserver");
  }
}

function findFiles(directory: string, extension: string, maxDepth: number): string[] {
  const results: string[] = [];
  walk(directory, 0, maxDepth, results, extension);
  return results;
}

function walk(current: string, depth: number, maxDepth: number, results: string[], extension: string) {
  if (depth > maxDepth) {
    return;
  }

  let entries: string[] = [];
  try {
    entries = readdirSync(current);
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry === "node_modules" || entry === ".git") {
      continue;
    }
    const fullPath = path.join(current, entry);
    let stat;
    try {
      stat = statSync(fullPath);
    } catch {
      continue;
    }
    if (stat.isFile() && entry.endsWith(extension)) {
      results.push(fullPath);
    } else if (stat.isDirectory() && !entry.startsWith(".")) {
      walk(fullPath, depth + 1, maxDepth, results, extension);
    }
  }
}

function quoteIfNeeded(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function toTitle(value: string): string {
  if (!value) {
    return "Task";
  }
  return value.toLowerCase() === "test" ? "Tests" : value.charAt(0).toUpperCase() + value.slice(1);
}

function disambiguateSuggestionLabel(label: string, command: string): string {
  const trimmedLabel = label.trim() || suggestionLabelForCommand(command, "Launch");
  const lower = command.trim().toLowerCase();

  if (lower.startsWith("go ")) {
    return `Go ${trimmedLabel}`;
  }
  if (lower.startsWith("dotnet ")) {
    return `Dotnet ${trimmedLabel}`;
  }
  if (lower.startsWith("docker ")) {
    return `Docker ${trimmedLabel}`;
  }
  if (lower.startsWith("python ")) {
    return `Python ${trimmedLabel}`;
  }

  return trimmedLabel;
}

function ensureUniqueSuggestionLabel(label: string, seenLabels: Set<string>): string {
  if (!seenLabels.has(label.toLowerCase())) {
    return label;
  }

  let counter = 2;
  let candidate = `${label} ${counter}`;
  while (seenLabels.has(candidate.toLowerCase())) {
    counter += 1;
    candidate = `${label} ${counter}`;
  }
  return candidate;
}

export function suggestionLabelForCommand(command: string, fallback: string): string {
  const trimmed = command.trim();
  if (!trimmed) {
    return fallback || "Launch";
  }
  if (trimmed.startsWith("npm run ")) {
    return toTitle(trimmed.slice("npm run ".length));
  }
  if (trimmed.startsWith("dotnet ")) {
    return toTitle(trimmed.slice("dotnet ".length));
  }
  return fallback || "Launch";
}
