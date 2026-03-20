import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import {
  KubeResourceSchema,
  normalizeCrdResourceSchema,
  normalizeOpenApiResourceSchema,
} from "./schema";

export interface KubeContextData {
  contexts: string[];
  currentContext?: string;
  source: "kubectl" | "kubeconfig";
}

export interface KubeApiResource {
  name: string;
  shortNames: string[];
  apiVersion: string;
  namespaced: boolean;
  kind: string;
  verbs: string[];
  categories: string[];
}

interface CommandResult {
  stdout: string;
  stderr: string;
}

interface KubeCustomResourceDefinition {
  metadata?: { name?: string };
  spec?: {
    group?: string;
    names?: { kind?: string; plural?: string };
    versions?: Array<{
      name?: string;
      served?: boolean;
      schema?: { openAPIV3Schema?: Record<string, unknown> };
    }>;
  };
}

const apiResourceCache = new Map<string, Promise<KubeApiResource[]>>();
const openApiCache = new Map<string, Promise<Record<string, unknown>>>();
const crdIndexCache = new Map<
  string,
  Promise<
    Array<{ name: string; group: string; kind: string; versions: string[] }>
  >
>();
const crdDocumentCache = new Map<
  string,
  Promise<KubeCustomResourceDefinition>
>();
const schemaCache = new Map<string, Promise<KubeResourceSchema>>();

function unquote(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

async function runCommand(
  command: string,
  args: string[],
  stdin?: string,
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(new Error(`Failed to run '${command}': ${error.message}`));
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(
        new Error(
          stderr.trim() || `Command failed: ${command} ${args.join(" ")}`,
        ),
      );
    });

    if (stdin) {
      child.stdin.write(stdin);
    }
    child.stdin.end();
  });
}

function shellEscapeArg(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

async function runKubectl(
  args: string[],
  stdin?: string,
): Promise<CommandResult> {
  try {
    return await runCommand("kubectl", args, stdin);
  } catch (error) {
    // Raycast may not inherit PATH/KUBECONFIG from login shell.
    if (
      !(error instanceof Error) ||
      !error.message.includes("Failed to run 'kubectl'")
    ) {
      throw error;
    }

    const command = `kubectl ${args.map(shellEscapeArg).join(" ")}`;
    return runCommand("/bin/zsh", ["-lc", command], stdin);
  }
}

function withContextArgs(
  context: string | undefined,
  args: string[],
): string[] {
  return context?.trim() ? ["--context", context.trim(), ...args] : args;
}

function parseKubeconfig(raw: string): {
  contexts: string[];
  currentContext?: string;
} {
  const contexts: string[] = [];
  let currentContext: string | undefined;
  let inContexts = false;

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const isTopLevel = !line.startsWith(" ") && !line.startsWith("\t");
    if (isTopLevel) {
      inContexts = trimmed.startsWith("contexts:");
      if (trimmed.startsWith("current-context:")) {
        currentContext = unquote(trimmed.slice("current-context:".length));
      }
      continue;
    }

    if (inContexts) {
      const nameMatch = trimmed.match(/^-?\s*name:\s*(.+)$/);
      if (nameMatch) {
        contexts.push(unquote(nameMatch[1]));
      }
    }
  }

  return { contexts, currentContext };
}

function getKubeconfigPaths(): string[] {
  const fromEnv = process.env.KUBECONFIG?.split(path.delimiter)
    .map((item) => item.trim())
    .filter(Boolean);
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv;
  }

  return [path.join(homedir(), ".kube", "config")];
}

async function getContextsFromKubeconfig(): Promise<KubeContextData> {
  const contexts = new Set<string>();
  let currentContext: string | undefined;

  const paths = getKubeconfigPaths();
  const reads = await Promise.all(
    paths.map(async (filePath) => {
      try {
        const content = await fs.readFile(filePath, "utf8");
        return parseKubeconfig(content);
      } catch {
        return { contexts: [], currentContext: undefined };
      }
    }),
  );

  for (const parsed of reads) {
    for (const context of parsed.contexts) {
      contexts.add(context);
    }

    if (!currentContext && parsed.currentContext) {
      currentContext = parsed.currentContext;
    }
  }

  if (contexts.size === 0) {
    throw new Error("No Kubernetes contexts found in kubeconfig");
  }

  return {
    contexts: Array.from(contexts).sort((a, b) => a.localeCompare(b)),
    currentContext,
    source: "kubeconfig",
  };
}

async function getContextsFromKubectl(): Promise<KubeContextData> {
  const configResult = await runKubectl(["config", "view", "-o", "json"]);
  const parsed = JSON.parse(configResult.stdout) as {
    contexts?: Array<{ name?: string }>;
    "current-context"?: string;
  };

  const contexts = (parsed.contexts ?? [])
    .map((item) => item.name?.trim())
    .filter((item): item is string => Boolean(item));
  const uniqueContexts = Array.from(new Set(contexts)).sort((a, b) =>
    a.localeCompare(b),
  );

  if (uniqueContexts.length === 0) {
    throw new Error("No Kubernetes contexts returned by kubectl");
  }

  return {
    contexts: uniqueContexts,
    currentContext: parsed["current-context"]?.trim() || undefined,
    source: "kubectl",
  };
}

function isApiVersionToken(value: string): boolean {
  return value.includes("/") || /^v\d/.test(value);
}

function parseApiResourceLine(line: string): KubeApiResource | null {
  const columns = line
    .trim()
    .split(/\s{2,}/)
    .filter(Boolean);
  if (columns.length < 5) {
    return null;
  }

  const name = columns[0];
  const hasShortNames = columns[1] && !isApiVersionToken(columns[1]);
  const shortNames = hasShortNames
    ? columns[1]
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
  const apiVersion = columns[hasShortNames ? 2 : 1];
  const namespaced = columns[hasShortNames ? 3 : 2];
  const kind = columns[hasShortNames ? 4 : 3];
  const verbs = columns[hasShortNames ? 5 : 4];
  const categories = columns[hasShortNames ? 6 : 5];

  if (!name || !apiVersion || !namespaced || !kind || !verbs) {
    return null;
  }

  return {
    name,
    shortNames,
    apiVersion,
    namespaced: namespaced === "true",
    kind,
    verbs: verbs
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    categories: categories
      ? categories
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [],
  };
}

export async function getApiResources(
  context?: string,
): Promise<KubeApiResource[]> {
  const cacheKey = context?.trim() || "__default__";
  if (!apiResourceCache.has(cacheKey)) {
    apiResourceCache.set(
      cacheKey,
      runKubectl(
        withContextArgs(context, [
          "api-resources",
          "--verbs=create",
          "--no-headers",
          "-o",
          "wide",
        ]),
      ).then((result) =>
        result.stdout
          .split(/\r?\n/)
          .map((line) => parseApiResourceLine(line))
          .filter((resource): resource is KubeApiResource => Boolean(resource))
          .filter((resource) => !resource.name.includes("/"))
          .sort((left, right) => {
            const kindComparison = left.kind.localeCompare(right.kind);
            if (kindComparison !== 0) {
              return kindComparison;
            }

            return left.apiVersion.localeCompare(right.apiVersion);
          }),
      ),
    );
  }

  return apiResourceCache.get(cacheKey)!;
}

async function getOpenApiDocument(
  context?: string,
): Promise<Record<string, unknown>> {
  const cacheKey = context?.trim() || "__default__";
  if (!openApiCache.has(cacheKey)) {
    openApiCache.set(
      cacheKey,
      runKubectl(
        withContextArgs(context, ["get", "--raw", "/openapi/v2"]),
      ).then((result) => JSON.parse(result.stdout) as Record<string, unknown>),
    );
  }

  return openApiCache.get(cacheKey)!;
}

async function getCustomResourceDefinitionIndex(
  context?: string,
): Promise<
  Array<{ name: string; group: string; kind: string; versions: string[] }>
> {
  const cacheKey = context?.trim() || "__default__";
  if (!crdIndexCache.has(cacheKey)) {
    crdIndexCache.set(
      cacheKey,
      runKubectl(
        withContextArgs(context, [
          "get",
          "crd",
          "-o",
          'jsonpath={range .items[*]}{.metadata.name}{"\\t"}{.spec.group}{"\\t"}{.spec.names.kind}{"\\t"}{range .spec.versions[*]}{.name}{","}{end}{"\\n"}{end}',
        ]),
      ).then((result) =>
        result.stdout
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const [name, group, kind, versions] = line.split("\t");
            return {
              name: name?.trim() || "",
              group: group?.trim() || "",
              kind: kind?.trim() || "",
              versions: (versions ?? "")
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
            };
          })
          .filter((item) => item.name && item.group && item.kind),
      ),
    );
  }

  return crdIndexCache.get(cacheKey)!;
}

function getApiVersionParts(apiVersion: string): {
  group: string;
  version: string;
} {
  const [maybeGroup, version] = apiVersion.includes("/")
    ? apiVersion.split("/", 2)
    : ["", apiVersion];
  return { group: maybeGroup, version };
}

function findMatchingCrdName(
  crds: Array<{
    name: string;
    group: string;
    kind: string;
    versions: string[];
  }>,
  resource: KubeApiResource,
): string | undefined {
  const { group, version } = getApiVersionParts(resource.apiVersion);

  return crds.find((crd) => {
    if (crd.group !== group) {
      return false;
    }

    if (crd.kind !== resource.kind) {
      return false;
    }

    return crd.versions.includes(version);
  })?.name;
}

async function getCustomResourceDefinitionDocument(
  name: string,
  context?: string,
): Promise<KubeCustomResourceDefinition> {
  const cacheKey = `${context?.trim() || "__default__"}|${name}`;
  if (!crdDocumentCache.has(cacheKey)) {
    crdDocumentCache.set(
      cacheKey,
      runKubectl(
        withContextArgs(context, ["get", "crd", name, "-o", "json"]),
      ).then(
        (result) => JSON.parse(result.stdout) as KubeCustomResourceDefinition,
      ),
    );
  }

  return crdDocumentCache.get(cacheKey)!;
}

function getCrdVersionSchema(
  crd: KubeCustomResourceDefinition,
  resource: KubeApiResource,
): Record<string, unknown> | undefined {
  const { version } = getApiVersionParts(resource.apiVersion);

  return (crd.spec?.versions ?? []).find(
    (item) => item.name === version && item.served !== false,
  )?.schema?.openAPIV3Schema;
}

export async function getResourceSchema(
  resource: KubeApiResource,
  context?: string,
): Promise<KubeResourceSchema> {
  const cacheKey = `${context?.trim() || "__default__"}|${resource.apiVersion}|${resource.kind}`;
  if (!schemaCache.has(cacheKey)) {
    schemaCache.set(
      cacheKey,
      (async () => {
        try {
          const openApiDocument = await getOpenApiDocument(context);
          return normalizeOpenApiResourceSchema(openApiDocument, resource);
        } catch (error) {
          if (
            !(error instanceof Error) ||
            !error.message.includes("OpenAPI schema not found")
          ) {
            throw error;
          }
        }

        const crdIndex = await getCustomResourceDefinitionIndex(context);
        const crdName = findMatchingCrdName(crdIndex, resource);
        if (!crdName) {
          throw new Error(
            `Schema not found for ${resource.kind} (${resource.apiVersion})`,
          );
        }

        const crd = await getCustomResourceDefinitionDocument(crdName, context);
        const crdSchema = getCrdVersionSchema(crd, resource);
        if (!crdSchema) {
          throw new Error(
            `CRD schema not found for ${resource.kind} (${resource.apiVersion})`,
          );
        }

        return normalizeCrdResourceSchema(crdSchema, resource);
      })(),
    );
  }

  return schemaCache.get(cacheKey)!;
}
export async function getKubeContexts(): Promise<KubeContextData> {
  try {
    return await getContextsFromKubectl();
  } catch {
    return getContextsFromKubeconfig();
  }
}

export async function applyManifestToContext(
  yaml: string,
  context?: string,
): Promise<CommandResult> {
  const args = withContextArgs(context, ["apply", "-f", "-"]);
  return runKubectl(args, yaml);
}

export async function dryRunManifestToContext(
  yaml: string,
  context?: string,
): Promise<CommandResult> {
  const args = withContextArgs(context, [
    "apply",
    "--dry-run=server",
    "-f",
    "-",
  ]);
  return runKubectl(args, yaml);
}
