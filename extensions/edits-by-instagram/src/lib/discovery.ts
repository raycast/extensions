import {
  ErrorCode,
  McpError,
  ResourceListChangedNotificationSchema,
  ToolListChangedNotificationSchema,
  type Resource,
  type ResourceTemplate,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { ConnectionError, type ConnectionConfig } from "./config";
import { withEditsClient } from "./connection";

export interface CapabilitySnapshot {
  server: { name: string; version: string } | undefined;
  checkedAt: string;
  tools: Tool[];
  resources: Resource[];
  resourceTemplates: ResourceTemplate[];
  resourceTemplatesSupported: boolean;
}

export async function collectPages<T>(
  fetchPage: (cursor?: string) => Promise<{ items: T[]; nextCursor?: string }>,
): Promise<T[]> {
  const items: T[] = [];
  const seen = new Set<string>();
  let cursor: string | undefined;
  for (let page = 0; page < 100; page++) {
    const result = await fetchPage(cursor);
    items.push(...result.items);
    if (result.nextCursor === undefined) return items;
    if (seen.has(result.nextCursor)) break;
    seen.add(result.nextCursor);
    cursor = result.nextCursor;
  }
  throw new ConnectionError(
    "Incomplete discovery",
    "The server returned repeated or too many pages. Refresh to try again.",
  );
}

/** Enumerates metadata; never calls tools or reads resource contents. */
export async function discoverCapabilities(
  config: ConnectionConfig,
  signal?: AbortSignal,
): Promise<CapabilitySnapshot> {
  return withEditsClient(
    config,
    async (client, sessionSignal) => {
      let changed = false;
      client.setNotificationHandler(ToolListChangedNotificationSchema, () => {
        changed = true;
      });
      client.setNotificationHandler(ResourceListChangedNotificationSchema, () => {
        changed = true;
      });
      const options = { signal: sessionSignal, timeout: 10_000 };
      const capabilities = client.getServerCapabilities();
      const tools = capabilities?.tools
        ? await collectPages(async (cursor) => {
            const page = await client.listTools({ cursor }, options);
            return { items: page.tools, nextCursor: page.nextCursor };
          })
        : [];
      const resources = capabilities?.resources
        ? await collectPages(async (cursor) => {
            const page = await client.listResources({ cursor }, options);
            return { items: page.resources, nextCursor: page.nextCursor };
          })
        : [];
      let resourceTemplates: ResourceTemplate[] = [];
      let resourceTemplatesSupported = Boolean(capabilities?.resources);
      if (capabilities?.resources) {
        try {
          resourceTemplates = await collectPages(async (cursor) => {
            const page = await client.listResourceTemplates({ cursor }, options);
            return { items: page.resourceTemplates, nextCursor: page.nextCursor };
          });
        } catch (error) {
          // Verified Edits build advertises resources, but not this optional enumeration method.
          if (error instanceof McpError && error.code === ErrorCode.MethodNotFound) resourceTemplatesSupported = false;
          else throw error;
        }
      }
      if (changed)
        throw new ConnectionError(
          "Capabilities changed",
          "Edits changed screens or tools during discovery. Refresh for a new snapshot.",
        );
      return {
        server: client.getServerVersion(),
        checkedAt: new Date().toISOString(),
        tools,
        resources,
        resourceTemplates,
        resourceTemplatesSupported,
      };
    },
    signal,
  );
}
