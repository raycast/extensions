import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Image } from "@raycast/api";
import type { ProcessInfo, Stack, StackItem } from "~/lib/types";

// Logos come from simple-icons (CC0), recoloured with each brand's colour and
// stored in assets/stack. Logos too dark for dark mode have a `-dark` variant.
const DARK_VARIANTS = new Set([
  "bun",
  "deno",
  "ollama",
  "openjdk",
  "nextdotjs",
  "remix",
  "expo",
  "angular",
  "django",
  "solid",
  "express",
  "fastify",
  "koa",
]);

const item = (name: string, icon: string): StackItem => ({ name, icon });

/** Matched against the process name. First match wins. */
const RUNTIMES: [RegExp, StackItem][] = [
  // Next.js renames its server process to `next-server (vX.Y.Z)`.
  [/^(node|nodejs|next-server)$/, item("Node.js", "nodedotjs")],
  [/^bun$/, item("Bun", "bun")],
  [/^deno$/, item("Deno", "deno")],
  [/^python[\d.]*$/, item("Python", "python")],
  // Puma retitles itself `puma 6.4.0 (tcp://…) [app]`.
  [/^(ruby|puma)$/, item("Ruby", "ruby")],
  [/^java$/, item("Java", "openjdk")],
  [/^php(-fpm)?[\d.]*$/, item("PHP", "php")],
  [/^dotnet$/, item("Dotnet", "dotnet")],
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

/**
 * Frameworks keyed by the CLI binary or npm package that appears in the
 * command line, e.g. `node …/node_modules/.bin/astro dev` or
 * `node …/node_modules/next/dist/server/lib/start-server.js`.
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
 * Vite is the dev server behind several meta-frameworks. When the command only
 * says `vite`, the project's dependencies tell us which one it is.
 */
const VITE_FRAMEWORKS: [string, StackItem][] = [
  ["@sveltejs/kit", FRAMEWORKS["svelte-kit"]],
  ["@react-router/dev", FRAMEWORKS["react-router"]],
  ["@remix-run/dev", FRAMEWORKS.remix],
  ["@solidjs/start", item("SolidStart", "solid")],
];

/**
 * Backend libraries don't have a CLI of their own (`node dist/server.js`,
 * `ts-node-dev src/index.ts`), so fall back to the project's dependencies.
 * Order matters: NestJS depends on Express, so it's checked first.
 */
const LIBRARIES: [string, StackItem][] = [
  ["@nestjs/core", FRAMEWORKS.nest],
  ["hono", item("Hono", "hono")],
  ["fastify", item("Fastify", "fastify")],
  ["koa", item("Koa", "koa")],
  ["express", item("Express", "express")],
];

const JS_RUNTIMES = new Set(["nodedotjs", "bun", "deno"]);

export async function detectStack(proc: ProcessInfo): Promise<Stack> {
  const name = proc.name.toLowerCase().replace(/\.exe$/, "");
  const runtime = RUNTIMES.find(([re]) => re.test(name))?.[1];
  // Frameworks only make sense for interpreted runtimes; this avoids matching
  // an unrelated binary whose arguments happen to contain e.g. `vite`.
  if (!runtime || !["nodedotjs", "bun", "deno", "python", "ruby", "php"].includes(runtime.icon)) {
    return { runtime };
  }

  let framework = frameworkFromCommand(proc.command);
  if (JS_RUNTIMES.has(runtime.icon) && proc.cwd && (!framework || framework === FRAMEWORKS.vite)) {
    const deps = await readNearestDependencies(proc.cwd, proc.git?.root);
    const candidates = framework ? VITE_FRAMEWORKS : LIBRARIES;
    framework = candidates.find(([dep]) => deps.has(dep))?.[1] ?? framework;
  }
  return { runtime, framework };
}

export function frameworkFromCommand(command: string): StackItem | undefined {
  for (const raw of command.split(/\s+/)) {
    // Windows command lines quote paths and use backslashes; normalise both.
    const token = raw.replace(/^"|"$/g, "").replaceAll("\\", "/");
    const pkg = token.match(/node_modules\/((?:@[^/]+\/)?[^/.][^/]*)\//)?.[1];
    // `.cmd`/`.ps1` are the npm shims in node_modules\.bin on Windows.
    const candidates = [path.posix.basename(token).replace(/\.(c|m)?js$|\.(cmd|ps1|exe)$/i, ""), pkg];
    for (const candidate of candidates) {
      if (candidate && Object.hasOwn(FRAMEWORKS, candidate)) return FRAMEWORKS[candidate];
    }
  }
  return undefined;
}

/**
 * Dependencies from the closest package.json at or above `dir`, stopping at
 * the repo root. In a monorepo that's the app's own package, not the root's.
 */
async function readNearestDependencies(dir: string, stopAt?: string): Promise<Set<string>> {
  let current = dir;
  while (true) {
    try {
      const pkg = JSON.parse(await readFile(path.join(current, "package.json"), "utf8"));
      return new Set([...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})]);
    } catch {
      const parent = path.dirname(current);
      if (current === stopAt || parent === current || !stopAt) return new Set();
      current = parent;
    }
  }
}

export function stackIcon(entry: StackItem): Image.ImageLike {
  const light = `stack/${entry.icon}.svg`;
  return DARK_VARIANTS.has(entry.icon) ? { source: { light, dark: `stack/${entry.icon}-dark.svg` } } : light;
}
