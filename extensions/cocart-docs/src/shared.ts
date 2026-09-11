import { Cache, Icon } from "@raycast/api";

const cache = new Cache({ capacity: 10 * 1024 * 1024 });

const LLMS_FULL_URL = "https://docs.cocartapi.com/llms-full.txt";
const LLMS_TXT_URL = "https://docs.cocartapi.com/llms.txt";
const GITHUB_RAW_BASE =
  "https://raw.githubusercontent.com/cocart-headless/cocart-api-documentation/refs/heads/main";
const HOOK_MDX_PATHS = [
  "/documentation/developers/actions",
  "/documentation/developers/filters",
  "/documentation/developers/functions",
  "/documentation/developers/jwt/actions",
  "/documentation/developers/jwt/filters",
];
const CACHE_KEY = "cocart-docs-cache";
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

export interface DocEntry {
  title: string;
  url: string;
  description: string;
  content: string;
  category: string;
  version: string;
  method?: string;
}

interface CachedData {
  entries: DocEntry[];
  timestamp: number;
}

export function categorizeFromUrl(url: string): string {
  if (url.includes("/api-reference/v2/cart/")) return "Cart";
  if (url.includes("/api-reference/v2/products/")) return "Products";
  if (url.includes("/api-reference/v2/sessions/")) return "Sessions";
  if (url.includes("/api-reference/v2/store/")) return "Store";
  if (url.includes("/api-reference/v2/user/")) return "User";
  if (url.includes("/api-reference/v2/variation")) return "Cart";
  if (url.includes("/api-reference/v1/cart/plus/")) return "Cart (Plus)";
  if (url.includes("/api-reference/v1/cart/")) return "Cart";
  if (url.includes("/api-reference/v1/products/")) return "Products";
  if (url.includes("/api-reference/v1/user/")) return "User";
  if (url.includes("/api-reference/v1/error")) return "Error Codes";
  if (url.includes("/api-reference/jwt/")) return "JWT";
  if (url.includes("/api-reference/plugins/")) return "Plugins";
  if (url.includes("/api-reference/")) return "API Reference";
  if (url.includes("/getting-started/jwt/")) return "JWT Setup";
  if (url.includes("/getting-started/")) return "Getting Started";
  if (url.includes("/tutorials/")) return "Tutorials";
  if (url.includes("/documentation/developers/jwt/actions"))
    return "JWT Action Hooks";
  if (url.includes("/documentation/developers/jwt/filters"))
    return "JWT Filters";
  if (url.includes("/documentation/developers/jwt/")) return "JWT Developers";
  if (url.includes("/documentation/developers/actions")) return "Action Hooks";
  if (url.includes("/documentation/developers/filters")) return "Filters";
  if (url.includes("/documentation/developers/functions")) return "Functions";
  if (url.includes("/documentation/developers/")) return "Developers";
  if (url.includes("/documentation/")) return "Documentation";
  if (url.includes("/knowledge-base/troubleshoot/")) return "Troubleshooting";
  if (url.includes("/knowledge-base/")) return "Knowledge Base";
  if (url.includes("/cli-reference/")) return "CLI Reference";
  if (url.includes("/breaking-changes/")) return "Breaking Changes";
  if (url.includes("/overview/")) return "Overview";
  if (url.includes("/plugins/")) return "Plugins";
  if (url.includes("/resources/")) return "Resources";
  if (url.includes("/updates/overview")) return "Overview";
  if (url.includes("/updates/")) return "Updates";
  return "Other";
}

export function versionFromUrl(url: string): string {
  if (url.includes("/api-reference/v1/")) return "v1";
  if (url.includes("/api-reference/v2/")) return "v2";
  if (url.includes("/api-reference/pre-release/")) return "pre-release";
  return "shared";
}

export function categoryIcon(category: string): Icon {
  switch (category) {
    case "Cart":
    case "Cart (Plus)":
      return Icon.Cart;
    case "Products":
      return Icon.Box;
    case "Sessions":
      return Icon.TwoPeople;
    case "Store":
      return Icon.Building;
    case "User":
      return Icon.Person;
    case "JWT":
    case "JWT Developers":
    case "JWT Setup":
      return Icon.Lock;
    case "API Reference":
    case "Error Codes":
      return Icon.Code;
    case "Getting Started":
      return Icon.Star;
    case "Tutorials":
      return Icon.Bookmark;
    case "Action Hooks":
    case "JWT Action Hooks":
      return Icon.Bolt;
    case "Filters":
    case "JWT Filters":
      return Icon.Filter;
    case "Functions":
      return Icon.CodeBlock;
    case "Developers":
      return Icon.Terminal;
    case "Documentation":
      return Icon.Book;
    case "Knowledge Base":
    case "Troubleshooting":
      return Icon.QuestionMark;
    case "CLI Reference":
      return Icon.Terminal;
    case "Breaking Changes":
      return Icon.Warning;
    case "Overview":
      return Icon.Info;
    case "Plugins":
      return Icon.Plug;
    case "Resources":
      return Icon.Link;
    case "Updates":
      return Icon.Bell;
    default:
      return Icon.Document;
  }
}

function parseLlmsTxt(text: string): Map<string, string> {
  const descriptions = new Map<string, string>();
  for (const line of text.split("\n")) {
    const match = line
      .trim()
      .match(/^-\s+\[([^\]]+)\]\(([^)]+)\)(?::\s*(.*))?$/);
    if (match && match[3]) {
      descriptions.set(match[2], match[3]);
    }
  }
  return descriptions;
}

function isContentSparse(content: string): boolean {
  const lines = content
    .trim()
    .split("\n")
    .filter((l) => l.trim().length > 0);
  return (
    lines.length <= 2 || /api-reference\/[^\s]+\.(?:yaml|json)\s/i.test(content)
  );
}

function parseLlmsFullTxt(text: string): DocEntry[] {
  const seen = new Map<string, number>();
  const entries: DocEntry[] = [];
  const lines = text.split("\n");
  let i = 0;

  while (i < lines.length) {
    const titleMatch = lines[i].match(/^# (.+)$/);
    if (
      titleMatch &&
      i + 1 < lines.length &&
      lines[i + 1].startsWith("Source: ")
    ) {
      const title = titleMatch[1];
      const url = lines[i + 1].replace("Source: ", "").trim();
      i += 2;

      const contentLines: string[] = [];
      while (i < lines.length) {
        if (
          lines[i].match(/^# .+$/) &&
          i + 1 < lines.length &&
          lines[i + 1].startsWith("Source: ")
        ) {
          break;
        }
        contentLines.push(lines[i]);
        i++;
      }

      const content = contentLines.join("\n").trim();

      const existing = seen.get(url);
      if (existing !== undefined) {
        if (content.length > entries[existing].content.length) {
          entries[existing] = {
            title,
            url,
            description: "",
            content,
            category: categorizeFromUrl(url),
            version: versionFromUrl(url),
          };
        }
      } else {
        seen.set(url, entries.length);
        entries.push({
          title,
          url,
          description: "",
          content,
          category: categorizeFromUrl(url),
          version: versionFromUrl(url),
        });
      }
    } else {
      i++;
    }
  }

  return entries;
}

interface OpenApiField {
  type: string;
  description: string;
  defaultValue?: string;
  required?: boolean;
  schemaRef?: string;
}

interface OpenApiOperation {
  parameters: Array<OpenApiField & { name: string }>;
  requestBody: Record<string, OpenApiField> | null;
  response200: {
    description: string;
    schemaRef: string | null;
    fields: Record<string, OpenApiField>;
  } | null;
}

interface ParsedOpenApiSpec {
  paths: Record<string, Record<string, OpenApiOperation>>;
  schemas: Record<
    string,
    { description: string; properties: Record<string, OpenApiField> }
  >;
}

function mergeDescriptions(
  entries: DocEntry[],
  indexText: string,
  openApiSpecs: Map<string, ParsedOpenApiSpec>,
): void {
  const rawDescriptions = parseLlmsTxt(indexText);
  const descriptions = new Map<string, string>();
  for (const [url, desc] of rawDescriptions) {
    descriptions.set(url.replace(/\.md$/, ""), desc);
  }
  for (const entry of entries) {
    const desc = descriptions.get(entry.url);
    if (desc) entry.description = desc;
    if (!isContentSparse(entry.content)) continue;

    // Try to build rich markdown from OpenAPI spec
    const specMatch = entry.content.match(
      /^(api-reference\/[^\s]+\.(?:yaml|json))\s+(get|post|put|delete|patch)\s+(\S+)/im,
    );
    if (specMatch) {
      const [, specPath, method, path] = specMatch;
      const spec = openApiSpecs.get(specPath);
      if (spec) {
        entry.method = method.toUpperCase();
        entry.content = buildEndpointMarkdown(
          spec,
          method,
          path,
          desc ?? entry.description,
        );
        continue;
      }
    }

    // Fallback
    if (desc) {
      entry.content = `${desc}\n\n---\n\n*To view the API specifications, open in browser for a full interactive reference.*`;
    }
  }
}

function loadCachedEntries(): DocEntry[] | null {
  const cached = cache.get(CACHE_KEY);
  if (!cached) return null;

  try {
    const data: CachedData = JSON.parse(cached);
    if (Date.now() - data.timestamp < CACHE_TTL) {
      return data.entries;
    }
  } catch {
    // Invalid cache
  }
  return null;
}

function cacheEntries(entries: DocEntry[]): void {
  const data: CachedData = { entries, timestamp: Date.now() };
  cache.set(CACHE_KEY, JSON.stringify(data));
}

async function fetchOpenApiSpecs(
  entries: DocEntry[],
): Promise<Map<string, ParsedOpenApiSpec>> {
  const specPaths = new Set<string>();
  for (const entry of entries) {
    const m = entry.content.match(
      /^(api-reference\/[^\s]+\.(?:yaml|json))\s/im,
    );
    if (m) specPaths.add(m[1]);
  }

  const results = new Map<string, ParsedOpenApiSpec>();
  await Promise.all(
    [...specPaths].map(async (specPath) => {
      try {
        const res = await fetch(`https://docs.cocartapi.com/${specPath}`);
        if (!res.ok) return;
        const text = await res.text();
        results.set(
          specPath,
          specPath.endsWith(".json")
            ? parseOpenApiJson(text)
            : parseOpenApiYaml(text),
        );
      } catch {
        // Non-fatal
      }
    }),
  );
  return results;
}

function collectYamlBlock(
  lines: string[],
  i: number,
  minIndent: number,
): [string, number] {
  const parts: string[] = [];
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trimStart();
    if (trimmed === "") {
      i++;
      continue;
    }
    if (line.length - trimmed.length < minIndent) break;
    parts.push(trimmed);
    i++;
  }
  return [parts.join(" ").trim(), i];
}

function parseOpenApiYaml(text: string): ParsedOpenApiSpec {
  const lines = text.split("\n");
  const result: ParsedOpenApiSpec = { paths: {}, schemas: {} };
  let i = 0;

  while (i < lines.length && !lines[i].match(/^paths:\s*$/)) i++;
  i++;

  while (i < lines.length) {
    if (lines[i].match(/^components:/)) break;
    const pathMatch = lines[i].match(/^ {2}(\/[^:]+):\s*$/);
    if (!pathMatch) {
      i++;
      continue;
    }

    const path = pathMatch[1];
    result.paths[path] = {};
    i++;

    while (i < lines.length) {
      if (!lines[i].match(/^ {4}\w/) || lines[i].match(/^components:/)) break;
      const methodMatch = lines[i].match(
        /^ {4}(get|post|put|delete|patch):\s*$/i,
      );
      if (!methodMatch) {
        i++;
        continue;
      }

      const method = methodMatch[1].toLowerCase();
      const op: OpenApiOperation = {
        parameters: [],
        requestBody: null,
        response200: null,
      };
      result.paths[path][method] = op;
      i++;

      while (i < lines.length) {
        const line = lines[i];
        if (
          line.match(/^ {4}(get|post|put|delete|patch):/i) ||
          line.match(/^ {2}\//) ||
          line.match(/^components:/)
        )
          break;

        if (line.match(/^ {6}parameters:\s*$/)) {
          i++;
          while (i < lines.length && lines[i].match(/^ {8}/)) {
            if (!lines[i].match(/^ {8}- /)) {
              i++;
              continue;
            }
            const inlineName = lines[i].match(/^ {8}- name:\s*(.+)/);
            const param = {
              name: "",
              type: "string",
              description: "",
              required: false,
              defaultValue: undefined as string | undefined,
            };
            if (inlineName) {
              param.name = inlineName[1].trim();
              i++;
            } else i++;
            while (i < lines.length && lines[i].match(/^ {10}/)) {
              const pf = lines[i].match(/^ {10}(\w+):\s*(.*)/);
              if (!pf) {
                i++;
                continue;
              }
              const [, key, val] = pf;
              if (key === "name") {
                param.name = val.trim();
                i++;
              } else if (key === "required") {
                param.required = val.trim() === "true";
                i++;
              } else if (key === "description") {
                if (
                  val.trim() === ">-" ||
                  val.trim() === ">" ||
                  val.trim() === "|"
                ) {
                  const [desc, ni] = collectYamlBlock(lines, i + 1, 12);
                  param.description = desc;
                  i = ni;
                } else {
                  param.description = val.trim();
                  i++;
                }
              } else if (key === "schema") {
                i++;
                while (i < lines.length && lines[i].match(/^ {12}/)) {
                  const sf = lines[i].match(/^ {12}(\w+):\s*(.*)/);
                  if (sf) {
                    if (sf[1] === "type") param.type = sf[2].trim();
                    if (sf[1] === "default")
                      param.defaultValue = sf[2]
                        .trim()
                        .replace(/^['"]|['"]$/g, "");
                  }
                  i++;
                }
              } else i++;
            }
            op.parameters.push(param);
          }
          continue;
        }

        if (line.match(/^ {6}requestBody:\s*$/)) {
          i++;
          op.requestBody = {};
          let inProperties = false;
          while (i < lines.length && lines[i].match(/^ {8}/)) {
            if (lines[i].match(/^ {14}properties:\s*$/)) {
              inProperties = true;
              i++;
              continue;
            }
            if (inProperties && lines[i].match(/^ {16}\w[^:]*:\s*$/)) {
              const propName = lines[i].trim().replace(/:$/, "");
              const prop = {
                type: "string",
                description: "",
                defaultValue: undefined as string | undefined,
              };
              i++;
              while (i < lines.length && lines[i].match(/^ {18}/)) {
                const pf = lines[i].match(/^ {18}(\w+):\s*(.*)/);
                if (pf) {
                  if (pf[1] === "type") prop.type = pf[2].trim();
                  else if (pf[1] === "default")
                    prop.defaultValue = pf[2]
                      .trim()
                      .replace(/^['"]|['"]$/g, "");
                  else if (pf[1] === "description") {
                    const dv = pf[2].trim();
                    if (dv === ">-" || dv === ">" || dv === "|") {
                      const [desc, ni] = collectYamlBlock(lines, i + 1, 20);
                      prop.description = desc;
                      i = ni;
                      continue;
                    }
                    prop.description = dv;
                  }
                }
                i++;
              }
              op.requestBody[propName] = prop;
            } else i++;
          }
          continue;
        }

        if (line.match(/^ {6}responses:\s*$/)) {
          i++;
          while (i < lines.length && lines[i].match(/^ {8}/)) {
            const statusMatch = lines[i].match(/^ {8}['"]?(\d+)['"]?:\s*$/);
            if (!statusMatch) {
              i++;
              continue;
            }
            const status = statusMatch[1];
            i++;
            if (status !== "200") {
              while (i < lines.length && lines[i].match(/^ {10}/)) i++;
              continue;
            }
            const resp: {
              description: string;
              schemaRef: string | null;
              fields: Record<string, OpenApiField>;
            } = { description: "", schemaRef: null, fields: {} };
            while (i < lines.length && lines[i].match(/^ {10}/)) {
              const rf = lines[i].match(/^ {10}description:\s*(.*)/);
              if (rf) {
                resp.description = rf[1].trim();
                i++;
                continue;
              }
              // Capture $ref for schema
              const refMatch = lines[i].match(
                /\$ref:\s*['"]?#\/components\/schemas\/(\w+)['"]?/,
              );
              if (refMatch) {
                resp.schemaRef = refMatch[1];
                i++;
                continue;
              }
              i++;
            }
            op.response200 = resp;
          }
          continue;
        }

        i++;
      }
    }
  }

  // Parse components/schemas
  while (i < lines.length && !lines[i].match(/^ {2}schemas:\s*$/)) i++;
  i++;
  while (i < lines.length) {
    const schemaMatch = lines[i].match(/^ {4}(\w+):\s*$/);
    if (!schemaMatch) {
      i++;
      continue;
    }
    const schemaName = schemaMatch[1];
    const schema = {
      description: "",
      properties: {} as Record<string, OpenApiField>,
    };
    result.schemas[schemaName] = schema;
    i++;
    let inProperties = false;
    while (i < lines.length && lines[i].match(/^ {6}/)) {
      if (lines[i].match(/^ {6}properties:\s*$/)) {
        inProperties = true;
        i++;
        continue;
      }
      if (inProperties && lines[i].match(/^ {8}\w[^:]*:\s*$/)) {
        const propName = lines[i].trim().replace(/:$/, "");
        const field: OpenApiField = { type: "object", description: "" };
        i++;
        while (i < lines.length && lines[i].match(/^ {10}/)) {
          const pf = lines[i].match(/^ {10}(\w+):\s*(.*)/);
          const refMatch = lines[i].match(
            /\$ref:\s*['"]?#\/components\/schemas\/(\w+)['"]?/,
          );
          if (refMatch) {
            field.type = "object";
            field.schemaRef = refMatch[1];
            i++;
          } else if (pf) {
            if (pf[1] === "type") field.type = pf[2].trim();
            else if (pf[1] === "description") field.description = pf[2].trim();
            i++;
          } else i++;
        }
        schema.properties[propName] = field;
      } else {
        i++;
      }
    }
  }

  return result;
}

function parseOpenApiJson(text: string): ParsedOpenApiSpec {
  const raw = JSON.parse(text) as Record<string, unknown>;
  const result: ParsedOpenApiSpec = { paths: {}, schemas: {} };
  const rawPaths = (raw.paths ?? {}) as Record<
    string,
    Record<string, Record<string, unknown>>
  >;
  for (const [path, methods] of Object.entries(rawPaths)) {
    result.paths[path] = {};
    for (const [method, o] of Object.entries(methods)) {
      const parsed: OpenApiOperation = {
        parameters: [],
        requestBody: null,
        response200: null,
      };

      for (const p of (o.parameters as Array<Record<string, unknown>>) ?? []) {
        const schema = (p.schema ?? {}) as Record<string, unknown>;
        parsed.parameters.push({
          name: String(p.name ?? ""),
          type: String(schema.type ?? "string"),
          description: String(p.description ?? "")
            .replace(/\s+/g, " ")
            .trim(),
          required: p.required === true,
          defaultValue:
            schema.default !== undefined ? String(schema.default) : undefined,
        });
      }

      if (o.requestBody) {
        const rb = o.requestBody as Record<string, unknown>;
        const content = rb.content as Record<string, unknown> | undefined;
        const schema = (
          content?.["application/json"] as Record<string, unknown> | undefined
        )?.schema as Record<string, unknown> | undefined;
        const props = (schema?.properties ?? {}) as Record<
          string,
          Record<string, unknown>
        >;
        parsed.requestBody = {};
        for (const [name, prop] of Object.entries(props)) {
          parsed.requestBody[name] = {
            type: String(prop.type ?? "string"),
            description: String(prop.description ?? "")
              .replace(/\s+/g, " ")
              .trim(),
            defaultValue:
              prop.default !== undefined ? String(prop.default) : undefined,
          };
        }
      }

      const responses = (o.responses ?? {}) as Record<
        string,
        Record<string, unknown>
      >;
      const resp200 = responses["200"];
      if (resp200) {
        const content = resp200.content as Record<string, unknown> | undefined;
        const jsonContent = content?.["application/json"] as
          | Record<string, unknown>
          | undefined;
        const schemaRef = (
          jsonContent?.schema as Record<string, unknown> | undefined
        )?.["$ref"] as string | undefined;
        const refName = schemaRef?.split("/").pop() ?? null;
        parsed.response200 = {
          description: String(resp200.description ?? "")
            .replace(/\s+/g, " ")
            .trim(),
          schemaRef: refName,
          fields: {},
        };
      }

      result.paths[path][method.toLowerCase()] = parsed;
    }
  }

  // Parse schemas
  const rawSchemas = ((raw.components as Record<string, unknown> | undefined)
    ?.schemas ?? {}) as Record<string, Record<string, unknown>>;
  for (const [name, schema] of Object.entries(rawSchemas)) {
    const props = (schema.properties ?? {}) as Record<
      string,
      Record<string, unknown>
    >;
    result.schemas[name] = {
      description: String(schema.description ?? ""),
      properties: Object.fromEntries(
        Object.entries(props).map(([k, v]) => {
          const ref = (v["$ref"] as string | undefined)?.split("/").pop();
          return [
            k,
            {
              type: ref ? "object" : String(v.type ?? "object"),
              description: String(v.description ?? "")
                .replace(/\s+/g, " ")
                .trim(),
              schemaRef: ref,
            },
          ];
        }),
      ),
    };
  }

  return result;
}

function buildEndpointMarkdown(
  spec: ParsedOpenApiSpec,
  method: string,
  path: string,
  description: string,
): string {
  const op = spec.paths[path]?.[method.toLowerCase()];
  const out: string[] = [];

  out.push(`## \`${method.toUpperCase()}\` ${path}\n`);
  out.push(`${description}\n`);
  out.push(
    `> View the full API specifications in browser for a complete interactive reference.\n`,
  );

  if (op?.parameters && op.parameters.length > 0) {
    out.push("### Parameters\n");
    for (const p of op.parameters) {
      const badge =
        p.defaultValue !== undefined ? ` \`default:${p.defaultValue}\`` : "";
      const req = p.required ? " *(required)*" : "";
      out.push(`\`${p.name}\` **${p.type}**${badge}${req}`);
      out.push(p.description ? `\n${p.description}\n` : "\n");
    }
  }

  if (op?.requestBody && Object.keys(op.requestBody).length > 0) {
    out.push("### Body Parameters\n");
    for (const [name, p] of Object.entries(op.requestBody)) {
      const badge =
        p.defaultValue !== undefined ? ` \`default:${p.defaultValue}\`` : "";
      out.push(`\`${name}\` **${p.type}**${badge}`);
      out.push(p.description ? `\n${p.description}\n` : "\n");
    }
  }

  if (op?.response200) {
    out.push("### Response\n");
    if (op.response200.description) out.push(`${op.response200.description}\n`);

    // Resolve schema properties
    const fields = op.response200.schemaRef
      ? (spec.schemas[op.response200.schemaRef]?.properties ?? {})
      : op.response200.fields;
    const fieldEntries = Object.entries(fields);
    for (let fi = 0; fi < fieldEntries.length; fi++) {
      const [name, f] = fieldEntries[fi];
      if (fi > 0) out.push("---\n");
      out.push(`\`${name}\` **${f.type}**`);
      out.push(f.description ? `\n${f.description}\n` : "\n");
      if (f.schemaRef) {
        const childProps = spec.schemas[f.schemaRef]?.properties ?? {};
        for (const [childName, cf] of Object.entries(childProps)) {
          out.push("---\n");
          out.push(`> \`${name}.${childName}\` **${cf.type}**`);
          out.push(cf.description ? `\n> ${cf.description}\n` : "\n");
        }
      }
    }
  }

  return out.join("\n");
}

async function fetchHookMdxSources(): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  await Promise.all(
    HOOK_MDX_PATHS.map(async (path) => {
      try {
        const url = `${GITHUB_RAW_BASE}${path}.mdx`;
        const res = await fetch(url);
        if (res.ok) results.set(path, await res.text());
      } catch {
        // Non-fatal — fall back to llms-full.txt content
      }
    }),
  );
  return results;
}

export async function fetchAndParse(): Promise<DocEntry[]> {
  const [fullResponse, indexResponse, mdxSources] = await Promise.all([
    fetch(LLMS_FULL_URL),
    fetch(LLMS_TXT_URL),
    fetchHookMdxSources(),
  ]);
  if (!fullResponse.ok)
    throw new Error(`Failed to fetch docs: ${fullResponse.status}`);

  const parsed = parseLlmsFullTxt(await fullResponse.text());
  const [indexText, openApiSpecs] = await Promise.all([
    indexResponse.ok ? indexResponse.text() : Promise.resolve(""),
    fetchOpenApiSpecs(parsed),
  ]);
  if (indexText) {
    mergeDescriptions(parsed, indexText, openApiSpecs);
  }

  // Replace hook entry content with the richer MDX source (which includes path= on ParamField)
  for (const entry of parsed) {
    const docPath = entry.url
      .replace("https://docs.cocartapi.com", "")
      .replace(/\.md$/, "");
    const mdx = mdxSources.get(docPath);
    if (mdx) entry.content = mdx;
  }

  return parsed;
}

export async function loadEntries(): Promise<DocEntry[]> {
  const cached = loadCachedEntries();
  if (cached) return cached;

  const parsed = await fetchAndParse();
  cacheEntries(parsed);
  return parsed;
}

export async function refreshEntries(): Promise<DocEntry[]> {
  cache.remove(CACHE_KEY);
  const parsed = await fetchAndParse();
  cacheEntries(parsed);
  return parsed;
}

// --- Recent items tracking ---

const RECENT_KEY = "cocart-recent-docs";
const MAX_RECENT = 20;

export interface RecentItem {
  title: string;
  url: string;
  category: string;
  source: string; // which command: "docs" | "endpoints" | "hooks" | "errors"
  timestamp: number;
}

export function getRecentItems(): RecentItem[] {
  const stored = cache.get(RECENT_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function addRecentItem(item: Omit<RecentItem, "timestamp">): void {
  const recent = getRecentItems();
  const filtered = recent.filter((r) => r.url !== item.url);
  filtered.unshift({ ...item, timestamp: Date.now() });
  cache.set(RECENT_KEY, JSON.stringify(filtered.slice(0, MAX_RECENT)));
}

export function extractCode(content: string): string {
  const blocks: string[] = [];
  const regex = /```[\w]*[^\n]*\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    blocks.push(match[1].trim());
  }
  return blocks.join("\n\n");
}

export function stripMdx(content: string): string {
  let result = content.replace(
    /<Accordion\s+[^>]*title="([^"]*)"[^>]*>/gi,
    "\n### $1\n",
  );
  result = result.replace(/<Tab\s+[^>]*title="([^"]*)"[^>]*>/gi, "\n**$1**\n");
  result = result.replace(/<Step\s+[^>]*title="([^"]*)"[^>]*>/gi, "\n**$1**\n");

  // Convert <ParamField> blocks into formatted parameter lines before stripping
  // Handles path=, query=, body= as the name attribute (in either order with type=)
  result = result.replace(
    /<ParamField\b[^>]*\b(?:path|query|body)="([^"]*)"[^>]*\btype="([^"]*)"[^>]*>([\s\S]*?)<\/ParamField>/gi,
    (_m, name, type, body) => `\n\`${name}\` **${type}**\n${body.trim()}\n`,
  );
  result = result.replace(
    /<ParamField\b[^>]*\btype="([^"]*)"[^>]*\b(?:path|query|body)="([^"]*)"[^>]*>([\s\S]*?)<\/ParamField>/gi,
    (_m, type, name, body) => `\n\`${name}\` **${type}**\n${body.trim()}\n`,
  );
  // ParamField with only type (no name attribute) — still format the type
  result = result.replace(
    /<ParamField\b[^>]*\btype="([^"]*)"[^>]*>([\s\S]*?)<\/ParamField>/gi,
    (_m, type, body) => `\n**\`${type}\`** — ${body.trim()}\n`,
  );

  // Upgrade **Parameters** and **Usage** bold headings to proper ### headings
  result = result.replace(/^\*\*Parameters\*\*\s*$/gm, "### Parameters");
  result = result.replace(/^\*\*Usage\*\*\s*$/gm, "### Usage");

  // Convert inline Note/Info/Warning/Tip tags to blockquotes
  result = result.replace(
    /<(Note|Info|Warning|Tip)>([^<]*)<\/\1>/gi,
    (_m, _tag, body) => `> ${body.trim()}`,
  );
  // Multi-line Note/Info/Warning/Tip blocks
  result = result.replace(
    /<(Note|Info|Warning|Tip)>([\s\S]*?)<\/\1>/gi,
    (_m, _tag, body) =>
      body
        .trim()
        .split("\n")
        .map((l: string) => `> ${l.trim()}`)
        .join("\n"),
  );

  // Strip <span> tags but keep their text content
  result = result.replace(/<span[^>]*>([^<]*)<\/span>/gi, "$1");

  // Strip "Plugin: Label" lines — already visible in the hook name/section context
  result = result.replace(/^Plugin:\s*.+$/gm, "");

  result = result.replace(/<\/?[A-Z][A-Za-z]*[^>]*\/?>/g, "");
  result = result.replace(/<\/?aside[^>]*>/gi, "");
  result = result.replace(/<br\s*\/?>/g, "\n");

  result = result.replace(
    /^[ \t]*(```\w+)(?:[^\S\n]+[^\n]*)?\n([\s\S]*?)^[ \t]*```$/gm,
    (_, lang, body) => {
      const lines = body.split("\n");
      const indents = lines
        .filter((l: string) => l.trim().length > 0)
        .map((l: string) => l.match(/^([ \t]*)/)?.[1].length ?? 0);
      const minIndent = indents.length > 0 ? Math.min(...indents) : 0;
      const dedented = lines.map((l: string) => l.slice(minIndent)).join("\n");
      return `${lang}\n${dedented}\`\`\``;
    },
  );

  const outputLines: string[] = [];
  let inCodeBlock = false;
  for (const line of result.split("\n")) {
    if (line.trimStart().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      outputLines.push(line);
    } else if (inCodeBlock) {
      outputLines.push(line);
    } else {
      outputLines.push(line.replace(/^[ \t]+/, ""));
    }
  }

  return outputLines.join("\n");
}
