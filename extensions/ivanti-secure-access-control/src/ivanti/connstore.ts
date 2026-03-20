import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";

import { IvantiConnection } from "./types";

export const CONNECTION_STORE_PATH = "/Library/Application Support/Pulse Secure/Pulse/connstore.dat";

const CONNECTION_BLOCK_PATTERN = /(\w+)\s+"([^"]+)"\s*\{([\s\S]*?)\n\}/g;
const ATTRIBUTE_PATTERN = /^\s*([a-z0-9-]+):\s*"([^"]*)"/gm;

export async function connectionStoreExists(): Promise<boolean> {
  try {
    await access(CONNECTION_STORE_PATH, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

export async function readConfiguredConnections(): Promise<IvantiConnection[]> {
  const content = await readFile(CONNECTION_STORE_PATH, "utf8");
  const connections: IvantiConnection[] = [];

  // connstore.dat is a custom text format, so parse the outer connection
  // blocks first and then collect the quoted key/value pairs inside each block.
  for (const match of content.matchAll(CONNECTION_BLOCK_PATTERN)) {
    const [, type, id, body] = match;
    if (!type || !id || !body || type === "userdata" || type === "machine" || type === "schema") {
      continue;
    }

    const attributes = new Map<string, string>();
    for (const attributeMatch of body.matchAll(ATTRIBUTE_PATTERN)) {
      const [, key, value] = attributeMatch;
      if (key) {
        attributes.set(key, value ?? "");
      }
    }

    const name = attributes.get("friendly-name");
    const uri = attributes.get("uri");
    if (!name || !uri) {
      continue;
    }

    const index = connections.length;
    connections.push({
      id,
      index,
      name,
      type,
      source: attributes.get("connection-source") ?? type,
      status: "unknown",
      uri,
    });
  }

  return connections;
}
