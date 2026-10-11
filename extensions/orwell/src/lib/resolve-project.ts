import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import type { Framework } from "./types";

const FRAMEWORK_MAP: [string, Framework][] = [
  ["next", "next"],
  ["nuxt", "nuxt"],
  ["astro", "astro"],
  ["@remix-run/dev", "remix"],
  ["gatsby", "gatsby"],
  ["@angular/cli", "angular"],
  ["ember-cli", "ember"],
  ["webpack-dev-server", "webpack-dev-server"],
  ["vite", "vite"],
];

export interface ProjectInfo {
  projectName: string;
  projectDir: string;
  framework: Framework;
}

export async function resolveProject(cwd: string, command?: string): Promise<ProjectInfo> {
  let dir = cwd;

  while (true) {
    const pkgPath = join(dir, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const raw = await readFile(pkgPath, "utf-8");
        const pkg = JSON.parse(raw);
        const projectName = pkg.name || basename(dir);
        const framework = detectFramework(pkg, command);
        return { projectName, projectDir: dir, framework };
      } catch {
        return {
          projectName: basename(dir),
          projectDir: dir,
          framework: detectFrameworkFromCommand(command),
        };
      }
    }

    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return {
    projectName: basename(cwd),
    projectDir: cwd,
    framework: detectFrameworkFromCommand(command),
  };
}

function detectFramework(pkg: Record<string, unknown>, command?: string): Framework {
  const allDeps: Record<string, string> = {
    ...((pkg.dependencies as Record<string, string>) ?? {}),
    ...((pkg.devDependencies as Record<string, string>) ?? {}),
  };

  for (const [dep, fw] of FRAMEWORK_MAP) {
    if (dep in allDeps) return fw;
  }

  return detectFrameworkFromCommand(command);
}

function detectFrameworkFromCommand(command?: string): Framework {
  if (!command) return "unknown";
  const cmd = command.toLowerCase();
  const hints: [string, Framework][] = [
    ["next", "next"],
    ["nuxt", "nuxt"],
    ["astro", "astro"],
    ["remix", "remix"],
    ["gatsby", "gatsby"],
    ["ng serve", "angular"],
    ["ember", "ember"],
    ["webpack-dev-server", "webpack-dev-server"],
    ["vite", "vite"],
  ];
  for (const [hint, fw] of hints) {
    if (cmd.includes(hint)) return fw;
  }
  return "unknown";
}
