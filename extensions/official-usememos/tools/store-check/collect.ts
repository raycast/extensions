import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { Asset, Manifest, Source } from "./rules";

export type RepoSnapshot = {
  root: string;
  manifest: Manifest;
  changelog: string | undefined;
  readme: string | undefined;
  help: string | undefined;
  assets: Asset[];
  screenshots: Asset[];
  packageLock: string | undefined;
  sources: Source[];
};

const readTextIfPresent = (path: string) => (existsSync(path) ? readFileSync(path, "utf8") : undefined);

const readPngs = (directory: string): Asset[] =>
  existsSync(directory)
    ? readdirSync(directory)
        .filter((name) => !name.startsWith("."))
        .map((name) => ({ name, bytes: new Uint8Array(readFileSync(join(directory, name))) }))
    : [];

const readSources = (directory: string, prefix = ""): Source[] =>
  existsSync(directory)
    ? readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const path = join(directory, entry.name);
        const label = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) return readSources(path, label);
        if (!/\.tsx?$/.test(entry.name)) return [];
        return [{ path: label, text: readFileSync(path, "utf8") }];
      })
    : [];

export const collectRepo = (root: string): RepoSnapshot => ({
  root,
  manifest: JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as Manifest,
  changelog: readTextIfPresent(join(root, "CHANGELOG.md")),
  readme: readTextIfPresent(join(root, "README.md")),
  help: readTextIfPresent(join(root, "help.md")),
  assets: readPngs(join(root, "assets")),
  screenshots: readPngs(join(root, "metadata")),
  packageLock: readTextIfPresent(join(root, "package-lock.json")),
  sources: readSources(join(root, "src")),
});
