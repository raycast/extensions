import { environment } from "@raycast/api";
import { join } from "path";
import { createFaviconStore } from "./favicon-store";

/**
 * Write a favicon data URI to a file under the extension's support path and
 * return its path, or null if it can't be decoded or written.
 *
 * Raycast serializes the whole List on every render, so inline data URIs
 * (some favicons are 40KB+) make typing lag with many tabs. File paths keep
 * the payload small.
 */
export const faviconPath = createFaviconStore(join(environment.supportPath, "favicons"));
