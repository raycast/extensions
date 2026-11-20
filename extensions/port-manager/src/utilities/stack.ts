import { readFile } from "fs/promises";
import { homedir } from "os";
import path from "path";
import type { Image } from "@raycast/api";

export interface StackItem {
  name: string;
  /** Basename of the logo in `assets/stack`. */
  icon: string;
}

export interface Stack {
  runtime?: StackItem;
  framework?: StackItem;
}

export interface StackSource {
  name?: string;
  path?: string;
  commandLine?: string;
}

const item = (name: string, icon: string): StackItem => ({ name, icon });

// Logos come from Simple Icons (CC0), recoloured with each brand's colour. Logos that are too dark
// to see in dark mode have a `-dark` variant.
const DARK_VARIANTS = new Set([
  "angular",
  "bun",
  "deno",
  "django",
  "expo",
  "express",
  "fastify",
  "koa",
  "nextdotjs",
  "ollama",
  "openjdk",
  "remix",
  "solid",
]);

/** Matched against the executable name. The first match wins. */
const RUNTIMES: [RegExp, StackItem][] = [
  // Next.js retitles its server process `next-server (vX.Y.Z)`, which `lsof +c0` reports as the name.
  [/^(node|nodejs|next-server)$/, item("Node.js", "nodedotjs")],
  [/^bun$/, item("Bun", "bun")],
  [/^deno$/, item("Deno", "deno")],
  [/^python[\d.]*w?$/, item("Python", "python")],
  // Puma retitles itself `puma 6.4.0 (tcp://…) [app]`.
  [/^(ruby|puma)$/, item("Ruby", "ruby")],
  [/^javaw?$/, item("Java", "openjdk")],
  [/^php(-fpm)?[\d.]*$/, item("PHP", "php")],
  [/^dotnet$/, item(".NET", "dotnet")],
  [/^beam\.smp$/, item("Elixir", "elixir")],
  [/^postgres$/, item("PostgreSQL", "postgresql")],
  [/^redis-server$/, item("Redis", "redis")],
  [/^(mysqld|mariadbd)$/, item("MySQL", "mysql")],
  [/^mongod$/, item("MongoDB", "mongodb")],
  [/^nginx$/, item("nginx", "nginx")],
  [/^caddy$/, item("Caddy", "caddy")],
  [/^ollama$/, item("Ollama", "ollama")],
  [/^(com\.docker\..+|docker.*|vpnkit.*)$/, item("Docker", "docker")],
];

/** Frameworks can only be told apart for these runtimes, whose command line names the script they run. */
const INTERPRETED = new Set(["nodedotjs", "bun", "deno", "python", "ruby", "php"]);
const JAVASCRIPT = new Set(["nodedotjs", "bun", "deno"]);

/**
 * Frameworks keyed by the CLI or npm package that appears in the command line, such as
 * `node …/node_modules/.bin/astro dev` or `node …/node_modules/next/dist/server/lib/start-server.js`.
 */
const FRAMEWORKS: Record<string, StackItem> = {
  next: item("Next.js", "nextdotjs"),
  "next-server": item("Next.js", "nextdotjs"),
  astro: item("Astro", "astro"),
  nuxt: item("Nuxt", "nuxt"),
  nuxi: item("Nuxt", "nuxt"),
  remix: item("Remix", "remix"),
  "@remix-run/dev": item("Remix", "remix"),
  "react-router": item("React Router", "reactrouter"),
  "@react-router/dev": item("React Router", "reactrouter"),
  "svelte-kit": item("SvelteKit", "svelte"),
  "@sveltejs/kit": item("SvelteKit", "svelte"),
  vite: item("Vite", "vite"),
  webpack: item("webpack", "webpack"),
  "webpack-cli": item("webpack", "webpack"),
  "webpack-dev-server": item("webpack", "webpack"),
  expo: item("Expo", "expo"),
  storybook: item("Storybook", "storybook"),
  ng: item("Angular", "angular"),
  "@angular/cli": item("Angular", "angular"),
  nest: item("NestJS", "nestjs"),
  "@nestjs/cli": item("NestJS", "nestjs"),
  gatsby: item("Gatsby", "gatsby"),
  wrangler: item("Cloudflare Workers", "cloudflareworkers"),
  "manage.py": item("Django", "django"),
  django: item("Django", "django"),
  "django-admin": item("Django", "django"),
  flask: item("Flask", "flask"),
  uvicorn: item("FastAPI", "fastapi"),
  fastapi: item("FastAPI", "fastapi"),
  jupyter: item("Jupyter", "jupyter"),
  "jupyter-lab": item("Jupyter", "jupyter"),
  "jupyter-notebook": item("Jupyter", "jupyter"),
  streamlit: item("Streamlit", "streamlit"),
  artisan: item("Laravel", "laravel"),
  rails: item("Rails", "rubyonrails"),
  puma: item("Rails", "rubyonrails"),
};

/**
 * Vite is the dev server behind several meta-frameworks. When the command line only says `vite`,
 * the project's dependencies tell which one it is.
 */
const VITE_FRAMEWORKS: [string, StackItem][] = [
  ["@sveltejs/kit", FRAMEWORKS["svelte-kit"]],
  ["@react-router/dev", FRAMEWORKS["react-router"]],
  ["@remix-run/dev", FRAMEWORKS.remix],
  ["@solidjs/start", item("SolidStart", "solid")],
];

/**
 * Server libraries have no CLI of their own (`node dist/server.js`), so they are found through the
 * project's dependencies. NestJS depends on Express, so it is checked first.
 */
const LIBRARIES: [string, StackItem][] = [
  ["@nestjs/core", FRAMEWORKS.nest],
  ["hono", item("Hono", "hono")],
  ["fastify", item("Fastify", "fastify")],
  ["koa", item("Koa", "koa")],
  ["express", item("Express", "express")],
];

/** The executable name without its directory or `.exe`, from the path when known since `lsof` names can be retitled. */
export function executableName(source: StackSource) {
  const value = source.path ?? source.name ?? "";
  return path.win32
    .basename(value)
    .replace(/\.exe$/i, "")
    .toLowerCase();
}

export function detectRuntime(source: StackSource) {
  const names = [executableName(source), executableName({ name: source.name?.split(/[\s(:[]/)[0] })];
  for (const [pattern, runtime] of RUNTIMES) {
    if (names.some((name) => pattern.test(name))) return runtime;
  }
}

export function frameworkFromCommand(commandLine: string) {
  for (const raw of commandLine.split(/\s+/)) {
    // Windows command lines quote paths and use backslashes.
    const token = raw.replace(/^"|"$/g, "").replace(/\\/g, "/");
    const packageName = token.match(/node_modules\/((?:@[^/]+\/)?[^/.][^/]*)\//)?.[1];
    // `.cmd` and `.ps1` are the npm shims in `node_modules\.bin` on Windows.
    const binary = path.posix.basename(token).replace(/\.(c|m)?js$|\.(cmd|ps1|exe)$/i, "");
    for (const candidate of [binary, packageName]) {
      if (candidate !== undefined && Object.prototype.hasOwnProperty.call(FRAMEWORKS, candidate)) {
        return FRAMEWORKS[candidate];
      }
    }
  }
}

/**
 * Dependencies of the closest `package.json` at or above `directory`, so a monorepo app reads its own
 * package rather than the workspace root. The search stops at the home directory.
 */
export async function readNearestDependencies(directory: string, stopAt = homedir()) {
  let current = directory;
  while (true) {
    try {
      const manifest = JSON.parse(await readFile(path.join(current, "package.json"), "utf8"));
      return new Set([...Object.keys(manifest.dependencies ?? {}), ...Object.keys(manifest.devDependencies ?? {})]);
    } catch {
      const parent = path.dirname(current);
      if (current === stopAt || parent === current) return new Set<string>();
      current = parent;
    }
  }
}

/** Identifies the runtime of a process and, for interpreted runtimes, the framework it serves. */
export async function detectStack(source: StackSource, workingDirectory?: string): Promise<Stack> {
  const runtime = detectRuntime(source);
  // Frameworks are only matched for interpreters, so an unrelated binary whose arguments happen to
  // contain e.g. `vite` is not mislabelled.
  if (runtime === undefined || !INTERPRETED.has(runtime.icon)) return { runtime };

  let framework = source.commandLine !== undefined ? frameworkFromCommand(source.commandLine) : undefined;
  if (JAVASCRIPT.has(runtime.icon) && workingDirectory !== undefined && (!framework || framework === FRAMEWORKS.vite)) {
    const dependencies = await readNearestDependencies(workingDirectory);
    const candidates = framework ? VITE_FRAMEWORKS : LIBRARIES;
    framework = candidates.find(([dependency]) => dependencies.has(dependency))?.[1] ?? framework;
  }

  return { runtime, framework };
}

export function stackIcon(entry: StackItem): Image.ImageLike {
  const light = `stack/${entry.icon}.svg`;
  return DARK_VARIANTS.has(entry.icon) ? { source: { light, dark: `stack/${entry.icon}-dark.svg` } } : light;
}
