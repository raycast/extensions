import { lstat, realpath, access } from "node:fs/promises";
import { constants } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, normalize, parse, relative, sep } from "node:path";
import { Artifact, DirectoryIdentity, ScanRecord, ScanRoot } from "../types";

export function expandPath(value: string): string {
  if (value === "~") return homedir();
  return value.startsWith("~/") ? join(homedir(), value.slice(2)) : value;
}

export function isWithin(root: string, path: string): boolean {
  const suffix = relative(root, path);
  return suffix !== "" && suffix !== ".." && !suffix.startsWith(`..${sep}`) && !isAbsolute(suffix);
}

// Inspect every ancestor, including the scan root. realpath alone would silently follow symlinks.
async function inspectChain(path: string): Promise<DirectoryIdentity[]> {
  const base = parse(path).root;
  const components = path.slice(base.length).split(sep).filter(Boolean);
  const paths = [base];
  for (const part of components) paths.push(join(paths[paths.length - 1], part));
  const identities: DirectoryIdentity[] = [];
  for (const current of paths) {
    const stat = await lstat(current);
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error(`Not an ordinary directory: ${current}`);
    identities.push({ path: current, dev: stat.dev, ino: stat.ino, birthtimeMs: stat.birthtimeMs });
  }
  return identities;
}

function sameIdentity(expected: DirectoryIdentity[], actual: DirectoryIdentity[]): boolean {
  return (
    expected.length === actual.length &&
    expected.every((item, index) => {
      const other = actual[index];
      return (
        item.path === other.path &&
        item.dev === other.dev &&
        item.ino === other.ino &&
        item.birthtimeMs === other.birthtimeMs
      );
    })
  );
}

export async function validateRoot(input: string): Promise<ScanRoot> {
  const expanded = expandPath(input.trim());
  if (!isAbsolute(expanded) || expanded.includes("\0")) throw new Error("Choose an absolute scan directory.");
  const path = await realpath(expanded);
  if (path === parse(path).root) throw new Error("Choose a project directory, not the filesystem root.");
  await access(path, constants.R_OK | constants.X_OK);
  return { path, identity: await inspectChain(path) };
}

function checkBoundary(root: ScanRoot, path: string, home: string): void {
  if (
    !isAbsolute(path) ||
    normalize(path) !== path ||
    !isWithin(root.path, path) ||
    path === home ||
    path === parse(path).root
  ) {
    throw new Error(`Refusing protected or out-of-root path: ${path}`);
  }
}

export async function captureArtifact(root: ScanRoot, record: ScanRecord): Promise<Artifact> {
  checkBoundary(root, record.path, await realpath(homedir()));
  const identity = await inspectChain(record.path);
  if (!sameIdentity(root.identity, identity.slice(0, root.identity.length)))
    throw new Error("The scan root changed. Scan again.");
  if ((await realpath(record.path)) !== record.path)
    throw new Error(`Directory resolves to a different path: ${record.path}`);
  return { ...record, identity };
}

export async function revalidateArtifact(root: ScanRoot, artifact: Artifact): Promise<void> {
  checkBoundary(root, artifact.path, await realpath(homedir()));
  const identity = await inspectChain(artifact.path);
  if (
    !sameIdentity(root.identity, identity.slice(0, root.identity.length)) ||
    !sameIdentity(artifact.identity, identity)
  ) {
    throw new Error(`Directory identity changed. Scan again: ${artifact.path}`);
  }
  if ((await realpath(artifact.path)) !== artifact.path) throw new Error(`Directory path changed: ${artifact.path}`);
}
