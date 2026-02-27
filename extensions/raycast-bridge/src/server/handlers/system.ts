import http from "http";
import {
  getFrontmostApplication,
  Clipboard,
  getSelectedText,
} from "@raycast/api";
import { ok, fail } from "../../utils/response";

export async function handleFrontmost(
  _req: http.IncomingMessage,
  res: http.ServerResponse,
) {
  try {
    const app = await getFrontmostApplication();
    ok(res, {
      name: app.name,
      bundleId: app.bundleId || null,
      path: app.path,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    fail(res, 500, "INTERNAL_ERROR", message);
  }
}

export async function handleClipboard(
  req: http.IncomingMessage,
  res: http.ServerResponse,
) {
  try {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);
    const content = await Clipboard.read({ offset });
    ok(res, content);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    fail(res, 500, "INTERNAL_ERROR", message);
  }
}

export async function handleSelectedText(
  _req: http.IncomingMessage,
  res: http.ServerResponse,
) {
  try {
    const text = await getSelectedText();
    ok(res, { text });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    fail(
      res,
      500,
      "INTERNAL_ERROR",
      message,
      "Make sure text is selected in the frontmost app",
    );
  }
}
