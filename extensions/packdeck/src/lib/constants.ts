import { Color, Icon } from "@raycast/api";
import { AuditSeverity, DependencyKind, PackageManagerName, ScriptCategory, SemverBump } from "../types";

export const DEFAULT_REGISTRY_URL = "https://registry.npmjs.org";
export const NPM_DOWNLOADS_API = "https://api.npmjs.org";

export const DEFAULT_PROJECT_DIRECTORIES = ["~/Projects", "~/Developer", "~/Code", "~/Workspace", "~/Sites"];

export const IGNORED_SCAN_DIRS = new Set([
  "node_modules",
  ".git",
  ".hg",
  ".svn",
  ".next",
  ".nuxt",
  ".svelte-kit",
  ".astro",
  ".output",
  ".turbo",
  ".cache",
  ".vercel",
  ".netlify",
  ".parcel-cache",
  ".vite",
  "dist",
  "build",
  "out",
  "coverage",
  "vendor",
  "Pods",
  "DerivedData",
  "target",
  ".venv",
  "venv",
  "__pycache__",
  "tmp",
  "temp",
  "Library",
  "Applications",
  ".Trash",
]);

export const LOCKFILE_MAP: ReadonlyArray<{ file: string; manager: PackageManagerName }> = [
  { file: "bun.lock", manager: "bun" },
  { file: "bun.lockb", manager: "bun" },
  { file: "pnpm-lock.yaml", manager: "pnpm" },
  { file: "yarn.lock", manager: "yarn" },
  { file: "package-lock.json", manager: "npm" },
  { file: "npm-shrinkwrap.json", manager: "npm" },
];

export const PACKAGE_MANAGER_META: Record<
  PackageManagerName,
  { label: string; color: Color; installUrl: string; shortTag: string }
> = {
  npm: {
    label: "npm",
    color: Color.Red,
    installUrl: "https://docs.npmjs.com/downloading-and-installing-node-js-and-npm",
    shortTag: "npm",
  },
  pnpm: {
    label: "pnpm",
    color: Color.Yellow,
    installUrl: "https://pnpm.io/installation",
    shortTag: "pnpm",
  },
  yarn: {
    label: "Yarn",
    color: Color.Blue,
    installUrl: "https://yarnpkg.com/getting-started/install",
    shortTag: "yarn",
  },
  bun: {
    label: "Bun",
    color: Color.Magenta,
    installUrl: "https://bun.sh/docs/installation",
    shortTag: "bun",
  },
};

export const BUMP_META: Record<SemverBump, { label: string; color: Color; icon: Icon }> = {
  major: { label: "Major", color: Color.Red, icon: Icon.ExclamationMark },
  minor: { label: "Minor", color: Color.Orange, icon: Icon.ArrowUpCircle },
  patch: { label: "Patch", color: Color.Green, icon: Icon.CheckCircle },
  prerelease: { label: "Prerelease", color: Color.Purple, icon: Icon.Tag },
  unknown: { label: "Update", color: Color.SecondaryText, icon: Icon.ArrowUp },
};

export const SEVERITY_META: Record<AuditSeverity, { label: string; color: Color; icon: Icon; rank: number }> = {
  critical: { label: "Critical", color: Color.Red, icon: Icon.XMarkCircleFilled, rank: 0 },
  high: { label: "High", color: Color.Orange, icon: Icon.Exclamationmark2, rank: 1 },
  moderate: { label: "Moderate", color: Color.Yellow, icon: Icon.Warning, rank: 2 },
  low: { label: "Low", color: Color.Blue, icon: Icon.Info, rank: 3 },
  info: { label: "Info", color: Color.SecondaryText, icon: Icon.Dot, rank: 4 },
};

export const DEPENDENCY_KIND_META: Record<DependencyKind, { label: string; shortLabel: string; color: Color }> = {
  dependencies: { label: "Dependencies", shortLabel: "prod", color: Color.Blue },
  devDependencies: { label: "Dev Dependencies", shortLabel: "dev", color: Color.Purple },
  peerDependencies: { label: "Peer Dependencies", shortLabel: "peer", color: Color.Orange },
  optionalDependencies: { label: "Optional Dependencies", shortLabel: "opt", color: Color.SecondaryText },
};

export const SCRIPT_CATEGORY_META: Record<ScriptCategory, { label: string; icon: Icon; color: Color }> = {
  dev: { label: "Dev", icon: Icon.Play, color: Color.Green },
  build: { label: "Build", icon: Icon.Hammer, color: Color.Blue },
  test: { label: "Test", icon: Icon.CheckCircle, color: Color.Purple },
  lint: { label: "Lint", icon: Icon.MagnifyingGlass, color: Color.Yellow },
  format: { label: "Format", icon: Icon.Wand, color: Color.Magenta },
  typecheck: { label: "Typecheck", icon: Icon.Code, color: Color.Blue },
  deploy: { label: "Deploy", icon: Icon.Upload, color: Color.Orange },
  clean: { label: "Clean", icon: Icon.Trash, color: Color.Red },
  other: { label: "Script", icon: Icon.Terminal, color: Color.SecondaryText },
};

export const POPULAR_PACKAGES_SUGGESTIONS: ReadonlyArray<{ name: string; description: string }> = [
  { name: "typescript", description: "TypeScript is a language for application-scale JavaScript" },
  { name: "react", description: "React is a JavaScript library for building user interfaces" },
  { name: "zod", description: "TypeScript-first schema validation with static type inference" },
  { name: "vitest", description: "Next generation testing framework powered by Vite" },
  { name: "tailwindcss", description: "A utility-first CSS framework for rapidly building custom user interfaces" },
  { name: "hono", description: "Ultrafast web framework for the Edges" },
  { name: "lucide-react", description: "A Lucide icon library package for React applications" },
  { name: "date-fns", description: "Modern JavaScript date utility library" },
];
