import http from "http";
import { launchCommand, LaunchType } from "@raycast/api";
import { ok, fail, parseBody } from "../../utils/response";

interface RunRequest {
  owner: string;
  extension: string;
  command: string;
  arguments?: Record<string, string>;
  context?: Record<string, unknown>;
}

export async function handleRun(
  req: http.IncomingMessage,
  res: http.ServerResponse,
) {
  let raw: string;
  try {
    raw = await parseBody(req);
  } catch {
    fail(res, 413, "BODY_TOO_LARGE", "Request body exceeds 1 MB limit");
    return;
  }

  let body: RunRequest;
  try {
    body = JSON.parse(raw);
  } catch {
    fail(res, 400, "INVALID_JSON", "Request body is not valid JSON");
    return;
  }

  if (!body.owner || !body.extension || !body.command) {
    fail(
      res,
      400,
      "MISSING_FIELDS",
      "Missing required fields: owner, extension, command",
    );
    return;
  }

  try {
    await launchCommand({
      name: body.command,
      extensionName: body.extension,
      ownerOrAuthorName: body.owner,
      type: LaunchType.UserInitiated,
      ...(body.arguments ? { arguments: body.arguments } : {}),
      ...(body.context ? { context: body.context } : {}),
    });
    ok(res, {
      success: true,
      note: "Command launched. launchCommand is fire-and-forget — no return data.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    fail(res, 500, "COMMAND_FAILED", message);
  }
}
