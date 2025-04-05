import fetch from "node-fetch";

import * as Y from "yjs";
import sanitizeHtml from "sanitize-html";
import { marked } from "marked";
import { getSchema } from "@tiptap/core";
import { generateJSON } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { prosemirrorJSONToYDoc } from "y-prosemirror";
import { OAuth } from "@raycast/api";
import { getAccessToken, OAuthService } from "@raycast/utils";

import { CLIENT_ID, URL_API, URL_APP } from "../config";

type JSONObject = { [key: string]: JSONValue };
type JSONArray = JSONValue[];
type JSONValue = string | number | boolean | null | JSONObject | JSONArray;

type APIRequestOptions = {
  path: string;
  method: string;
  body?: Buffer | JSONValue;
  expectedStatusCodes?: number[];
};

export interface Resource {
  id: string;
  name: string;
  kind: string;
  extension: string;
  data: {
    webpage?: {
      description: string;
      favicon: {
        url: string;
      };
    };
    preview?: {
      content: string;
    };
  };
  thumbnail?: {
    sm: string;
  };
}

export enum Kind {
  DEFAULT_FILE = "default",
  IMAGE = "image",
  DOCUMENT = "document",
  FOLDER = "folder",
  BOOKMARK = "bookmark",
  HIGHLIGHT = "highlight",
  NOTEPAD = "notepad",
  VIDEO = "video",
  AUDIO = "audio",
}

export interface SearchQuery {
  text: string;
  kind?: Kind;
}

export interface CreateNotepadParams {
  name: string;
  content: string;
}

export interface CreateBookmarkParams {
  url: string;
  comment: string;
}

/**
 * Given a object it tries to transform it into a JSONValue that can be sent to
 * the server. e.g. undefined are removed, Date objects are transformed into
 * ISO strings, etc.
 * @param value The value to transform.
 * @returns The transformed value.
 * @throws If the value is not transformable.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
function transformToJSONValue(value: any): JSONValue {
  if (value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(transformToJSONValue);
  }

  if (typeof value === "object") {
    if (value === null) {
      return null;
    }

    const result: JSONObject = {};

    for (const [key, objectValue] of Object.entries(value)) {
      result[key] = transformToJSONValue(objectValue);
    }

    return result;
  }

  return value;
}

/**
 * A lightweight client to interact with Fabric API, in this case for:
 * - Fetching items
 * - Creating items
 */
class FabricClient {
  private endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  private async request({ path, method, body, expectedStatusCodes = [200] }: APIRequestOptions) {
    const { token } = await getAccessToken();
    const response = await fetch(`${this.endpoint}${path}`, {
      method,
      headers: {
        "Content-Type": body instanceof Buffer ? "application/octet-stream" : "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: body instanceof Buffer ? body : JSON.stringify(body),
    });

    if (!expectedStatusCodes.includes(response.status)) {
      const body = await response.text();

      throw new Error(`Request failed with status ${response.status}: ${body}`);
    }

    return response;
  }

  async listResources(query: SearchQuery): Promise<Resource[]> {
    const response = await this.request({
      path: "/resources/filter",
      method: "POST",
      body: transformToJSONValue({
        name: query.text,
        ...(query.kind && { kind: [query.kind] }),
      }),
      expectedStatusCodes: [200],
    });

    const body = (await response.json()) as { resources: Resource[] };
    return body.resources;
  }

  async searchResources(query: SearchQuery): Promise<Resource[]> {
    if (!query.text) {
      return await this.listResources(query);
    }

    const response = await this.request({
      path: "/search",
      method: "POST",
      body: transformToJSONValue({
        mode: "hybrid",
        text: query.text,
        ...(query.kind && {
          filters: {
            kinds: [query.kind],
          },
        }),
      }),
      expectedStatusCodes: [200],
    });

    const body = (await response.json()) as { hits: Resource[] };
    return body.hits;
  }

  async createNotepad({ name, content }: CreateNotepadParams) {
    await this.request({
      path: "/notepads",
      method: "POST",
      body: transformToJSONValue({
        ...(name && { name }),
        parentId: "@alias::inbox",
        ydoc: Array.from(await this.createYDocFromMarkdown(content)),
      }),
      expectedStatusCodes: [201],
    });
  }

  async createBookmark({ url, comment }: CreateBookmarkParams) {
    await this.request({
      path: "/bookmarks",
      method: "POST",
      body: transformToJSONValue({
        url,
        ...(comment && {
          comment: {
            content: comment,
          },
        }),
        parentId: "@alias::inbox",
      }),
      expectedStatusCodes: [201],
    });
  }

  private async createYDocFromMarkdown(md: string): Promise<Uint8Array> {
    const html = sanitizeHtml(await marked.parse(md));
    const extensions: any[] = [
      StarterKit.configure({
        codeBlock: false,
        history: false,
      }),
      Markdown.configure({
        html: true,
        bulletListMarker: "-",
        transformPastedText: true,
        transformCopiedText: false,
      }),
    ];
    const schema = getSchema(extensions);
    const json = generateJSON(html, extensions);
    const yDoc = prosemirrorJSONToYDoc(schema, json, "default");
    return Y.encodeStateAsUpdate(yDoc);
  }
}

const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Fabric",
  providerIcon: "fabric-icon.png",
  providerId: "fabric",
  description: "Connect your Fabric account",
});

const fabricClient = new FabricClient(`${URL_API}/v2`);
export const oauthService = new OAuthService({
  client: oauthClient,
  clientId: CLIENT_ID,
  scope: "",
  authorizeUrl: `${URL_APP}/oauth/authorize`,
  tokenUrl: `${URL_API}/v2/oauth/token`,
  bodyEncoding: "url-encoded",
});

export function getFabricClient(): FabricClient {
  if (!fabricClient) {
    throw new Error("Fabric client not initialized");
  }

  return fabricClient;
}

export default FabricClient;
