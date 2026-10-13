import { z } from "zod";
import {
  accessSchema,
  assetSchema,
  buildSchema,
  collectionSchema,
  createdPenSchema,
  deploymentSchema,
  fileSchema,
  fileWriteSchema,
  isBuildPending,
  penDetailsSchema,
  penSchema,
  versionSchema,
  versionWithFilesSchema,
  type CollectionDetails,
  type PenDetails,
  type TextFileInput,
} from "./models";

const API = "https://api.codepen.io/v2/";
export type Page<T> = { data: T[]; next: string | null };
export type PenFilters = {
  search?: string;
  filter?: "all" | "V2" | "Classic" | "templates" | "deployed" | "Public" | "Private" | "Protected" | "Collaborators";
};

export class CodePenError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "CodePenError";
  }
}

export function apiURL(path: string): URL {
  const url = new URL(path, API);
  if (url.origin !== "https://api.codepen.io" || !url.pathname.startsWith("/v2/") || url.username || url.password) {
    throw new Error("Invalid CodePen API URL");
  }
  return url;
}

export function nextLink(header: string | null): string | null {
  const next = header?.match(/<([^>]+)>;\s*rel="next"/)?.[1];
  return next ? apiURL(next).href : null;
}

export function pensPath({ search = "", filter = "all" }: PenFilters = {}): string {
  if (search.length > 200) throw new Error("Search must be 200 characters or fewer");
  const query = new URLSearchParams({ per_page: "50", sort: "updated", direction: "desc" });
  if (search.trim()) query.set("search_term", search.trim());
  if (filter === "V2" || filter === "Classic") query.set("editor", filter);
  else if (filter === "templates") query.set("template", "true");
  else if (filter === "deployed") query.set("deployed", "true");
  else if (filter !== "all") query.set("access", accessSchema.parse(filter));
  return `pens?${query}`;
}

const id = (value: string) => {
  if (!value.trim() || value === "." || value === "..") throw new Error("A CodePen ID is required");
  return encodeURIComponent(value);
};
const fileInputSchema = z.object({
  path: z
    .string()
    .trim()
    .min(1)
    .refine((path) => !path.endsWith("/") && !path.split("/").includes(".."), "Enter a file path"),
  content: z.string(),
});

export function validatePenDetails(details: PenDetails) {
  const parsed = penDetailsSchema.parse(details);
  if (parsed.access === "Protected" && !parsed.password)
    throw new Error("Protected Pens require a password of at least 8 characters");
  if (parsed.password && parsed.access !== "Protected")
    throw new Error("Passwords are only supported for Protected Pens");
  return parsed;
}

export function validateAssetFilename(filename: string): string {
  return z
    .string()
    .trim()
    .min(1, "Enter a filename")
    .refine((name) => !/[\\/]/.test(name), "Filenames cannot contain slashes")
    .parse(filename);
}

export class CodePenClient {
  constructor(
    private readonly apiKey: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  private async response(path: string, method = "GET", body?: unknown) {
    const key = this.apiKey.trim();
    if (!key) throw new Error("Add your CodePen API key in extension preferences");
    const multipart = body instanceof FormData;
    const url = apiURL(path);
    let response: Response;
    try {
      response = await this.fetcher(url, {
        method,
        headers: {
          Authorization: `Bearer ${key}`,
          Accept: "application/json",
          ...(!multipart && body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: body === undefined ? undefined : multipart ? body : JSON.stringify(body),
        signal: AbortSignal.timeout(90_000),
        redirect: "error",
      });
    } catch {
      throw new Error(
        method === "GET"
          ? "Could not reach CodePen. Check your connection and try again."
          : "The request was interrupted. It may have succeeded; check CodePen before trying again.",
      );
    }
    if (!response.ok) {
      const error = z
        .object({ message: z.string(), code: z.string().optional() })
        .safeParse(await response.json().catch(() => null));
      const message = error.success ? error.data.message : `CodePen returned HTTP ${response.status}`;
      const hint =
        response.status === 401
          ? " Check your API key in extension preferences."
          : response.status === 429
            ? " Wait until your CodePen allowance resets."
            : "";
      throw new CodePenError(message + hint, response.status, error.success ? error.data.code : undefined);
    }
    return response;
  }

  private async request<T>(path: string, schema: z.ZodType<T>, method = "GET", body?: unknown): Promise<T> {
    const response = await this.response(path, method, body);
    const parsed = schema.safeParse(await response.json().catch(() => null));
    if (!parsed.success) {
      throw new Error(
        method === "GET"
          ? "CodePen returned an unexpected response"
          : "CodePen accepted the request, but its response could not be read. Check CodePen before repeating it.",
      );
    }
    return parsed.data;
  }

  async page<T>(path: string, schema: z.ZodType<T>): Promise<Page<T>> {
    const response = await this.response(path);
    const parsed = z.array(schema).safeParse(await response.json());
    if (!parsed.success) throw new Error("CodePen returned an unexpected list response");
    return { data: parsed.data, next: nextLink(response.headers.get("link")) };
  }

  listPens(filters?: PenFilters, next?: string) {
    return this.page(next ?? pensPath(filters), penSchema);
  }
  getPen(penId: string) {
    return this.request(`pens/${id(penId)}`, penSchema);
  }
  getFiles(penId: string) {
    return this.request(`pens/${id(penId)}/files`, z.array(fileSchema));
  }
  getVersion(versionId: string) {
    return this.request(`versions/${id(versionId)}`, versionWithFilesSchema);
  }
  getBuild(buildId: string) {
    return this.request(`builds/${id(buildId)}`, buildSchema);
  }
  listVersions(penId: string, next?: string) {
    return this.page(next ?? `pens/${id(penId)}/versions?per_page=50`, versionSchema);
  }

  createPen(details: PenDetails, files?: TextFileInput[]) {
    return this.request("pens", createdPenSchema, "POST", {
      ...validatePenDetails(details),
      files: files ? z.array(fileInputSchema).min(1).parse(files) : undefined,
      wait: 45,
    });
  }

  async updatePen(penId: string, details: Partial<PenDetails>) {
    const pen = await this.requireV2(penId);
    // Omitted fields stay unchanged, including an existing Protected password.
    const parsed = penDetailsSchema.partial().parse(details);
    if (parsed.access === "Protected" && pen.access !== "Protected" && !parsed.password)
      throw new Error("Protected Pens require a password of at least 8 characters");
    if (parsed.password && (parsed.access ?? pen.access) !== "Protected")
      throw new Error("Passwords are only supported for Protected Pens");
    return this.request(`pens/${id(penId)}`, penSchema, "PATCH", parsed);
  }

  async forkPen(penId: string, details: PenDetails) {
    await this.requireV2(penId);
    return this.request(`pens/${id(penId)}/fork`, createdPenSchema, "POST", {
      ...validatePenDetails(details),
      wait: 45,
    });
  }

  private async requireV2(penId: string) {
    const pen = await this.getPen(penId);
    if (pen.editor === "Classic") throw new Error("Classic Pens are read-only in API v2. Open this Pen in CodePen.");
    return pen;
  }

  async writeFiles(penId: string, expectedVersionId: string, files: TextFileInput[]) {
    const parsed = z.array(fileInputSchema).min(1).parse(files);
    const pen = await this.requireV2(penId);
    if (isBuildPending(pen.saved_version?.build))
      throw new Error("The previous build is still running. Refresh the Pen before editing again.");
    if (!expectedVersionId || pen.saved_version?.id !== expectedVersionId)
      throw new CodePenError(
        "This Pen has changed. Refresh its source files before saving your edits.",
        409,
        "CONFLICT",
      );
    return this.request(`pens/${id(penId)}/files`, fileWriteSchema, "PUT", {
      files: parsed,
      expected_version_id: expectedVersionId,
      wait: 45,
    });
  }

  async deletePen(penId: string) {
    await this.requireV2(penId);
    await this.response(`pens/${id(penId)}`, "DELETE");
  }
  async deployPen(penId: string) {
    const pen = await this.requireV2(penId);
    if (!pen.saved_version || pen.saved_version.build?.status !== "Success")
      throw new Error("A successful saved build is required before deploying");
    return this.request(`pens/${id(penId)}/deployment`, deploymentSchema, "PUT", { version_id: pen.saved_version.id });
  }
  async undeployPen(penId: string) {
    await this.requireV2(penId);
    await this.response(`pens/${id(penId)}/deployment`, "DELETE");
  }

  async snapshot(penId: string) {
    const pen = await this.getPen(penId);
    if (pen.editor === "Classic" || !pen.saved_version)
      return { pen, version: null, files: await this.getFiles(penId) };
    const version = await this.getVersion(pen.saved_version.id);
    return { pen, version, files: version.files };
  }

  listCollections(next?: string) {
    return this.page(next ?? "collections?per_page=100&sort=updated", collectionSchema);
  }
  listCollectionPens(collectionId: string, next?: string) {
    return this.page(next ?? `collections/${id(collectionId)}/pens?per_page=50`, penSchema);
  }
  saveCollection(details: CollectionDetails, collectionId?: string) {
    const parsed = z
      .object({
        title: collectionId ? z.string().trim().min(1).optional() : z.string().trim().min(1),
        description: z.string().optional(),
        access: z.enum(["Public", "Private"]).optional(),
      })
      .parse(details);
    return this.request(
      collectionId ? `collections/${id(collectionId)}` : "collections",
      collectionSchema,
      collectionId ? "PATCH" : "POST",
      parsed,
    );
  }
  async deleteCollection(collectionId: string) {
    await this.response(`collections/${id(collectionId)}`, "DELETE");
  }
  addToCollection(collectionId: string, penId: string) {
    return this.request(`collections/${id(collectionId)}/pens/${id(penId)}`, collectionSchema, "PUT");
  }
  async removeFromCollection(collectionId: string, penId: string) {
    await this.response(`collections/${id(collectionId)}/pens/${id(penId)}`, "DELETE");
  }

  listAssets(next?: string) {
    return this.page(next ?? "assets?per_page=100&sort=updated", assetSchema);
  }
  getAsset(assetId: string) {
    return this.request(`assets/${id(assetId)}`, assetSchema);
  }
  uploadAsset(filename: string, bytes: Uint8Array) {
    const name = validateAssetFilename(filename);
    if (!bytes.byteLength || bytes.byteLength > 30 * 1024 * 1024)
      throw new Error("Choose a non-empty file up to 30 MB");
    const body = new FormData();
    body.append("filename", name);
    body.append("file", new Blob([new Uint8Array(bytes)]), name);
    return this.request("assets", assetSchema, "POST", body);
  }
  saveTextAsset(filename: string, content: string) {
    return this.request("assets", assetSchema, "POST", { filename: validateAssetFilename(filename), content });
  }
  renameAsset(assetId: string, filename: string) {
    return this.request(`assets/${id(assetId)}`, assetSchema, "PATCH", { filename: validateAssetFilename(filename) });
  }
  async deleteAsset(assetId: string) {
    await this.response(`assets/${id(assetId)}`, "DELETE");
  }
}
