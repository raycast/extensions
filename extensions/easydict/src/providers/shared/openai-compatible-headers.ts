/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { randomUUID } from "node:crypto";

import { EASYDICT_VERSION } from "@/consts";

const OPENCODE_GO_ORIGIN = "https://opencode.ai";
const OPENCODE_GO_PATH = "/zen/go/v1";

export function getOpenAICompatibleRequestHeaders(url: URL): Record<string, string> | undefined {
  if (url.origin !== OPENCODE_GO_ORIGIN || url.pathname !== OPENCODE_GO_PATH) return undefined;

  return {
    "User-Agent": `raycast-easydict/${EASYDICT_VERSION}`,
    "x-opencode-session": randomUUID(),
  };
}
