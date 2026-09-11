// Pure parser for `android create --list`. Kept free of any Raycast or Node
// imports so it can be unit-tested directly against captured CLI stdout.
import { quoteArg } from "./shell";

export interface ProjectTemplate {
  /** The template id passed to `android create` (without the "(default)" marker). */
  name: string;
  /** Human-readable description shown in the dropdown. */
  description: string;
  /** The template's tags (e.g. "compose", "activity", "agp-9"). */
  tags: string[];
  /** True when the CLI flagged this row with the "(default)" suffix. */
  isDefault: boolean;
}

/** The fields the Create Project form collects before running the CLI. */
export interface CreateProjectOptions {
  /** Template id from the dropdown (the parsed {@link ProjectTemplate.name}). */
  template: string;
  /** Application name, e.g. "My Application" (may contain spaces). */
  name: string;
  /** Minimum SDK api level; omit to let the template's default apply. */
  minSdk?: string;
  /** Destination directory the project is scaffolded into. */
  outputDir: string;
}

const HEADERS = ["Template name", "Template description", "Tags"] as const;
const DEFAULT_SUFFIX = /\s*\(default\)\s*$/;

/**
 * Parse `android create --list` stdout into the available templates.
 *
 * Real output is a fixed-width table whose columns start at the offsets of
 * their header labels:
 *
 *   Template name                           Template description    Tags
 *   empty-activity (default)                Empty Activity          compose,activity,agp-9
 *
 * We locate each column's start index in the header line and slice every data
 * row at those boundaries, so multi-word descriptions survive intact. The
 * default template carries a "(default)" suffix on its name, which we strip
 * while recording the flag.
 */
export function parseTemplateList(stdout: string): ProjectTemplate[] {
  const lines = stdout.split("\n");
  const headerIndex = lines.findIndex((line) => isHeaderLine(line));
  if (headerIndex < 0) {
    return [];
  }

  const [nameStart, descStart, tagsStart] = HEADERS.map((header) =>
    lines[headerIndex].indexOf(header)
  );

  const templates: ProjectTemplate[] = [];
  for (const line of lines.slice(headerIndex + 1)) {
    if (line.trim().length === 0) {
      continue;
    }

    const rawName = line.slice(nameStart, descStart).trim();
    const description = line.slice(descStart, tagsStart).trim();
    const rawTags = line.slice(tagsStart).trim();

    const isDefault = DEFAULT_SUFFIX.test(rawName);
    const name = rawName.replace(DEFAULT_SUFFIX, "").trim();
    const tags =
      rawTags.length > 0 ? rawTags.split(",").map((t) => t.trim()) : [];

    templates.push({ name, description, tags, isDefault });
  }

  return templates;
}

function isHeaderLine(line: string): boolean {
  return HEADERS.every((header) => line.includes(header));
}

/**
 * Assemble the `android create` shell command from the form options. Every
 * interpolated value is POSIX single-quoted so application names and paths
 * containing spaces or quotes can't break out of the command. `--minSdk` is
 * omitted when not supplied so the template's own default takes effect.
 */
export function buildCreateCommand(
  cli: string,
  options: CreateProjectOptions
): string {
  const parts = [
    quoteArg(cli),
    "create",
    quoteArg(options.template),
    `--name=${quoteArg(options.name)}`,
  ];
  if (options.minSdk) {
    parts.push(`--minSdk=${quoteArg(options.minSdk)}`);
  }
  parts.push(`-o=${quoteArg(options.outputDir)}`);
  return parts.join(" ");
}

/**
 * Derive the project's own directory from the chosen parent directory and the
 * app name. `android create` scaffolds straight into its `-o` path with no
 * subfolder, so we append the (verbatim, trimmed) app name to the parent. This
 * gives the project its own folder under the projects directory, which is what
 * makes it show up as a distinct entry in the List Projects command.
 */
export function projectDestination(parentDir: string, name: string): string {
  const parent = parentDir.replace(/\/+$/, "");
  return `${parent}/${name.trim()}`;
}
