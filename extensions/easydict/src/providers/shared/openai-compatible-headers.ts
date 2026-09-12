/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { randomUUID } from "node:crypto";

import { normalizeOpenAICompatibleEndpoint } from "@/ai-providers/endpoint";
import { EASYDICT_VERSION } from "@/consts";

const OPENCODE_GO_ORIGIN = "https://opencode.ai";
const OPENCODE_GO_PATH = "/zen/go/v1";

export function getOpenAICompatibleRequestHeaders(endpoint: string): Record<string, string> | undefined {
  let url: URL;
  try {
    url = new URL(normalizeOpenAICompatibleEndpoint(endpoint));
  } catch {
    return undefined;
  }

  if (url.origin !== OPENCODE_GO_ORIGIN || url.pathname !== OPENCODE_GO_PATH) return undefined;

  return {
    "User-Agent": `raycast-easydict/${EASYDICT_VERSION}`,
    "x-opencode-session": randomUUID(),
  };
}
