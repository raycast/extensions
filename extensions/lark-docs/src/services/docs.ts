import { cookieJar, baseClient, expireSession, LarkAPIError } from "./client";
import { DOMAIN, GENERAL_DOMAIN } from "../utils/config";
import { trimTagsAndDecodeEntities } from "../utils/string";

export type UserID = string;
export type NodeID = string;

export enum NodeType {
  Doc = 2,
  Sheet = 3,
  Bitable = 8,
  MindNote = 11,
  Box = 12,
  Slides = 15,
  Wiki = 16,
  Docx = 22,
}

export enum CreateType {
  Docx = "docx",
  Sheet = "sheet",
  Slides = "slides",
}

export interface UserEntity {
  id: UserID;
  name?: string;
  cn_name?: string;
  en_name?: string;
  avatar_url?: string;
}

export interface NodeEntity {
  owner_id?: UserID;
  obj_token: NodeID;
  name?: string;
  type: NodeType;
  url?: string;
  edit_time?: number;
  activity_time?: number;
  extra?: {
    subtype?: "pptx" | "json" | "zip" | "mov" | "pdf" | "xlsx" | "key";
    parent_folder_name?: string;
  };
  icon_info?: string;
}

export interface ObjectEntity {
  token: NodeID;
  type: NodeType;
  title?: string;
  preview?: string;
  owner_id?: UserID;
  url: string;
  edit_time?: number;
  subtype?: string;
  wiki_infos?: Array<{ wiki_url?: string }> | null;
}

export interface RecentDocsResponse {
  node_list: NodeID[];
  has_more: boolean;
  total: number;
  entities: {
    nodes: Record<NodeID, NodeEntity>;
    users: Record<UserID, UserEntity>;
  };
}

export interface SearchDocsResponse {
  tokens: NodeID[];
  has_more: boolean;
  total: number;
  entities: {
    objs: Record<NodeID, ObjectEntity>;
    users: Record<UserID, UserEntity>;
  };
}

export interface CreatedDocument {
  token: string;
  type: NodeType;
  title: string;
  url: string;
}

interface APIEnvelope<T> {
  code: number;
  msg?: string;
  message?: string;
  data: T;
}

interface CreateObjectPayload {
  node_list?: string[];
  entities?: {
    nodes?: Record<string, Partial<NodeEntity>>;
  };
  token?: string;
  obj_token?: string;
  obj_type?: NodeType;
  title?: string;
  name?: string;
  url?: string;
  obj_url?: string;
}

function getDocsClient() {
  if (!DOMAIN || !GENERAL_DOMAIN) {
    throw new LarkAPIError("Please configure the self-hosted domain in extension preferences.");
  }

  return baseClient.extend({
    prefixUrl: `${GENERAL_DOMAIN}/space/api/`,
    hooks: {
      beforeRequest: [
        (options) => {
          options.headers.referer = GENERAL_DOMAIN;
        },
      ],
      afterResponse: [
        async (response) => {
          const envelope = response.body as unknown as APIEnvelope<unknown>;
          if (!envelope || typeof envelope !== "object" || !("code" in envelope)) {
            throw new LarkAPIError("Unexpected response from Lark.");
          }

          if (envelope.code !== 0) {
            if (envelope.code === 5) {
              await expireSession();
            }
            throw new LarkAPIError(envelope.message || envelope.msg || "Lark request failed", envelope.code);
          }

          response.body = envelope.data as never;
          return response;
        },
      ],
    },
  });
}

export function getInitialsName(user: UserEntity | undefined): string {
  return user?.name || user?.cn_name || user?.en_name || "";
}

export function isNodeEntity(entity: NodeEntity | ObjectEntity): entity is NodeEntity {
  return "obj_token" in entity;
}

export async function fetchRecentDocs(length: number, signal?: AbortSignal): Promise<RecentDocsResponse> {
  const response = await getDocsClient().get<RecentDocsResponse>("explorer/recent/list/", {
    searchParams: { length },
    signal,
  });
  return response.body;
}

export async function searchDocs(query: string, count = 15, signal?: AbortSignal): Promise<SearchDocsResponse> {
  const response = await getDocsClient().get<SearchDocsResponse>("search/refine_search/", {
    searchParams: {
      query,
      offset: 0,
      count,
    },
    signal,
  });

  const result = response.body;
  for (const token of Object.keys(result.entities?.objs ?? {})) {
    const entity = result.entities.objs[token];
    result.entities.objs[token] = {
      ...entity,
      title: trimTagsAndDecodeEntities(entity.title),
      preview: trimTagsAndDecodeEntities(entity.preview),
      type: normalizeObjectType(entity),
      url: normalizeDocumentUrl(entity.url || entity.wiki_infos?.[0]?.wiki_url || "", entity.type, entity.token),
    };
  }

  return result;
}

export async function removeRecentDocument(objToken: string): Promise<void> {
  await getDocsClient().post("explorer/recent/delete/", {
    form: { obj_token: objToken },
  });
}

export async function createDocument(type: CreateType, title: string): Promise<CreatedDocument> {
  const nodeType = createTypeToNodeType(type);
  const csrfToken = await getCsrfToken();
  const requestId = createRequestId();
  const response = await getDocsClient().post<CreateObjectPayload>("explorer/v2/create/object/", {
    form: {
      // The web app represents the My Documents root with an empty parent token.
      parent_token: "",
      type: nodeType,
      name: title.trim(),
      time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Shanghai",
      source: 0,
      ua_type: "Web",
      scene: "space_create",
    },
    headers: {
      "X-CSRFToken": csrfToken,
      "Request-Id": requestId,
      "X-Request-Id": requestId,
    },
  });

  return extractCreatedDocument(response.body, nodeType, title);
}

async function getCsrfToken(): Promise<string> {
  let cookies = await cookieJar.getCookies(`${GENERAL_DOMAIN}/space/`);
  let token = cookies.find((cookie) => cookie.key === "_csrf_token")?.value;

  if (!token) {
    // Loading the space shell/API causes the web backend to issue its CSRF cookie.
    await getDocsClient().get("explorer/recent/list/", {
      searchParams: { length: 1 },
    });
    cookies = await cookieJar.getCookies(`${GENERAL_DOMAIN}/space/`);
    token = cookies.find((cookie) => cookie.key === "_csrf_token")?.value;
  }

  return token || "";
}

function createTypeToNodeType(type: CreateType): NodeType {
  switch (type) {
    case CreateType.Sheet:
      return NodeType.Sheet;
    case CreateType.Slides:
      return NodeType.Slides;
    case CreateType.Docx:
    default:
      return NodeType.Docx;
  }
}

function extractCreatedDocument(
  payload: CreateObjectPayload,
  fallbackType: NodeType,
  fallbackTitle: string,
): CreatedDocument {
  const token =
    payload.node_list?.[0] ||
    payload.obj_token ||
    payload.token ||
    (payload.entities?.nodes ? Object.keys(payload.entities.nodes)[0] : "");

  if (!token) {
    throw new LarkAPIError("Lark created the file but did not return a document token.");
  }

  const node = payload.entities?.nodes?.[token];
  const type = node?.type || payload.obj_type || fallbackType;
  const title = trimTagsAndDecodeEntities(node?.name || payload.name || payload.title || fallbackTitle) || "Untitled";
  const url = normalizeDocumentUrl(node?.url || payload.url || payload.obj_url || "", type, token);

  return { token, type, title, url };
}

function normalizeObjectType(entity: ObjectEntity): NodeType {
  return entity.wiki_infos ? NodeType.Wiki : entity.type;
}

export function normalizeDocumentUrl(rawUrl: string, type: NodeType, token: string): string {
  if (rawUrl) {
    const absoluteUrl = rawUrl.startsWith("/") ? `${GENERAL_DOMAIN}${rawUrl}` : rawUrl;
    return absoluteUrl
      .replace(/\/space\/doc\//, "/docs/")
      .replace(/\/space\/sheet\//, "/sheets/")
      .replace(/\/space\/bitable\//, "/base/")
      .replace(/\/space\/mindnote\//, "/mindnotes/")
      .replace(/\/space\/slides\//, "/slides/")
      .replace(/\/space\//, "/");
  }

  const route = documentRoute(type);
  return `${GENERAL_DOMAIN}/${route}/${encodeURIComponent(token)}`;
}

function documentRoute(type: NodeType): string {
  switch (type) {
    case NodeType.Doc:
      return "docs";
    case NodeType.Sheet:
      return "sheets";
    case NodeType.Bitable:
      return "base";
    case NodeType.MindNote:
      return "mindnotes";
    case NodeType.Slides:
      return "slides";
    case NodeType.Docx:
      return "docx";
    default:
      return "docs";
  }
}

function createRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
