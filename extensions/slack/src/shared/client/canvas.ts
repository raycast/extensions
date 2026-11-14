import { createHash } from "node:crypto";
import { WebClient, type WebAPICallResult, type WebClientOptions } from "@slack/web-api";

type CanvasClient = Pick<WebClient, "apiCall">;

export function createCanvasClient(token: string, agent?: WebClientOptions["agent"]): WebClient {
  // An insert may have succeeded even if its response was lost. Never resend it
  // automatically, and surface rate limits before Raycast's tool deadline.
  return new WebClient(token, {
    ...(agent && { agent }),
    retryConfig: { retries: 0 },
    rejectRateLimitedCalls: true,
    timeout: 10_000,
  });
}

export function parseCanvasSectionTypes(value: string | undefined): string[] | undefined {
  const types = value?.split(/[,\s]+/).filter(Boolean);
  return types?.length ? types : undefined;
}

export type CanvasReadInput = {
  canvas: string;
  containsText?: string;
  sectionTypes?: string[];
};

export type CanvasEditInput = CanvasReadInput & {
  operation: "insert_before" | "insert_after" | "insert_at_start" | "insert_at_end" | "replace" | "delete" | "rename";
  expectedSnapshot: string;
  sectionId?: string;
  markdown?: string;
};

const sectionTypes: string[] = [
  "any_header",
  "h1",
  "h2",
  "h3",
  "blockquote",
  "callout",
  "canvas_unfurl",
  "chart",
  "citation",
  "file_unfurl",
  "flexbox",
  "horizontal_line",
  "list",
  "message_unfurl",
  "sfdc_record_mention",
  "sfdc_record_unfurl",
  "table",
  "user_mention",
  "user_unfurl",
];

export function parseCanvasId(value: string): string {
  const trimmed = value.trim();
  if (/^F[A-Z0-9]{8,}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    const match = url.pathname.match(/^\/docs\/T[A-Z0-9]+\/(F[A-Z0-9]{8,})\/?$/);
    if (url.protocol === "https:" && url.hostname.endsWith(".slack.com") && !url.username && !url.password && match) {
      return match[1];
    }
  } catch {
    // Report the same actionable validation error for malformed URLs and IDs.
  }
  throw new Error("Canvas must be an F-prefixed Slack canvas ID or an https://workspace.slack.com/docs/T…/F… URL");
}

function criteriaFor(input: CanvasReadInput) {
  if (input.containsText !== undefined && !input.containsText.trim()) {
    throw new Error("Canvas lookup text cannot be empty");
  }
  if (
    input.sectionTypes &&
    (input.sectionTypes.length === 0 || input.sectionTypes.some((type) => !sectionTypes.includes(type)))
  ) {
    throw new Error("Unsupported canvas section type");
  }
  if (input.sectionTypes && input.sectionTypes.length > 3) {
    throw new Error("Canvas lookup accepts at most three section types");
  }
  return {
    ...(input.containsText !== undefined && { contains_text: input.containsText }),
    ...(input.sectionTypes && { section_types: input.sectionTypes }),
    ...(input.containsText === undefined && !input.sectionTypes && { section_types: ["any_header"] }),
  };
}

function canvasError(error: unknown, method: string): Error {
  const data = (error as { data?: { error?: string; needed?: string; detail?: string } } | null)?.data;
  const code = data?.error ?? (error instanceof Error ? error.message : String(error));
  const transport = error as { code?: string; retryAfter?: number } | null;
  if (transport?.code === "slack_webapi_rate_limited_error") {
    return new Error(
      `${method}: Slack rate limit. Wait ${transport.retryAfter ?? "the requested"} seconds before trying again.`,
    );
  }
  if (transport?.code === "slack_webapi_request_error" || transport?.code === "slack_webapi_http_error") {
    return new Error(
      `${method}: Slack request failed or timed out; no automatic retry was made. Check your connection and proxy settings.${method === "canvases.edit" ? " The edit may have been applied; read the canvas before retrying." : ""}`,
    );
  }
  const advice: Record<string, string> = {
    missing_scope: `Add ${data?.needed ?? "canvases:read and canvases:write"} to the Slack app's user scopes, reinstall it, and reauthorize Raycast (or update the personal token).`,
    canvas_not_found:
      "The canvas does not exist or the authenticated user cannot view it. Check the workspace and canvas sharing permissions.",
    canvas_deleted: "The canvas has been deleted.",
    access_denied: "The authenticated user needs access to this canvas.",
    no_permission: "The authenticated user needs edit access to this canvas.",
    restricted_action: "Slack permissions or workspace policy prohibit this action.",
    canvas_disabled_user_team: "Canvas is disabled for this workspace.",
    canvas_editing_failed:
      "Slack rejected the edit target or Markdown content. Read and look up the target again; unsupported content must be edited in Slack.",
    canvas_editing_locked: "Another edit is in progress. Read the canvas again before retrying.",
    invalid_arguments: "Slack rejected the edit target or arguments. Read and look up the target again.",
    free_teams_cannot_edit_standalone_canvases: "This workspace plan cannot edit standalone canvases through the API.",
  };
  return new Error(
    `${method}: ${code}. ${advice[code] ?? (method === "canvases.edit" ? "Read the canvas before retrying an edit; a failed request may have been applied." : "Check canvas access and Slack service status before retrying.")}${data?.detail ? ` Detail: ${data.detail}` : ""}`,
  );
}

async function call(client: CanvasClient, method: string, args: Record<string, unknown>) {
  try {
    // The installed SDK predates getContent, rename and the expanded section types.
    // apiCall uses the Canvas client's existing token and proxy without scraping Slack.
    const response = await client.apiCall(method, args);
    if (!response.ok) throw { data: response };
    return response as WebAPICallResult & { content?: unknown; sections?: unknown };
  } catch (error) {
    throw canvasError(error, method);
  }
}

async function contentFor(client: CanvasClient, canvasId: string) {
  const markdown = await call(client, "canvases.getContent", { canvas_id: canvasId, content_type: "markdown" });
  const html = await call(client, "canvases.getContent", { canvas_id: canvasId, content_type: "html" });
  if (typeof markdown.content !== "string" || typeof html.content !== "string") {
    throw new Error("Slack returned unsupported canvas content: expected Markdown and HTML strings");
  }
  return {
    markdown: markdown.content,
    html: html.content,
    snapshot: createHash("sha256")
      .update(JSON.stringify([canvasId, markdown.content, html.content]))
      .digest("hex"),
  };
}

async function lookup(client: CanvasClient, canvasId: string, criteria: ReturnType<typeof criteriaFor>) {
  const response = await call(client, "canvases.sections.lookup", { canvas_id: canvasId, criteria });
  if (!Array.isArray(response.sections) || response.sections.some((section) => typeof section?.id !== "string")) {
    throw new Error("Slack returned unsupported canvas section identifiers");
  }
  return response.sections as { id: string }[];
}

export async function readCanvas(client: CanvasClient, input: CanvasReadInput) {
  const canvasId = parseCanvasId(input.canvas);
  const lookupCriteria = criteriaFor(input);
  const content = await contentFor(client, canvasId);
  const sections = await lookup(client, canvasId, lookupCriteria);
  return {
    canvasId,
    ...content,
    sections,
    lookupCriteria,
    limitations:
      "Section lookup returns IDs without section bodies or offsets. Default lookup finds headings only; use containsText to find other sections. Never infer a content-to-ID mapping from ordering. Edits replace entire sections, not text ranges or table cells; replacement Markdown may change the target's formatting. Preserve unsupported rich content in Slack. The snapshot detects intervening content changes but is not an atomic Slack revision lock.",
  };
}

export function validateCanvasEdit(input: CanvasEditInput) {
  const canvasId = parseCanvasId(input.canvas);
  const targeted = ["insert_before", "insert_after", "replace", "delete"].includes(input.operation);
  if (
    !["insert_before", "insert_after", "insert_at_start", "insert_at_end", "replace", "delete", "rename"].includes(
      input.operation,
    )
  ) {
    throw new Error("Unsupported canvas operation");
  }
  if (!/^[a-f0-9]{64}$/.test(input.expectedSnapshot))
    throw new Error("Use the snapshot from Read Canvas before editing");
  if (targeted && (!input.sectionId?.trim() || !input.containsText?.trim())) {
    throw new Error(
      "Targeted edits require a sectionId and containsText from Read Canvas; whole-canvas replacement is prohibited",
    );
  }
  if (
    !targeted &&
    (input.sectionId !== undefined || input.containsText !== undefined || input.sectionTypes !== undefined)
  ) {
    throw new Error("This operation does not accept section lookup fields");
  }
  if (input.operation === "delete") {
    if (input.markdown !== undefined) throw new Error("Delete does not accept Markdown");
  } else if (typeof input.markdown !== "string" || !input.markdown.trim()) {
    throw new Error("Provide nonempty Markdown for the edit (or the new title for rename)");
  } else if (input.markdown.length > 1_048_576) {
    throw new Error("Canvas edit Markdown exceeds Slack's 1,048,576-character limit");
  }
  if (targeted) criteriaFor(input);
  return { canvasId, targeted };
}

export async function editCanvas(client: CanvasClient, input: CanvasEditInput) {
  const { canvasId, targeted } = validateCanvasEdit(input);
  if (targeted) {
    const sections = await lookup(client, canvasId, criteriaFor(input));
    if (sections.length !== 1 || sections[0].id !== input.sectionId) {
      throw new Error(
        "Invalid or ambiguous canvas edit target. Read Canvas with more specific criteria; exactly one matching section is required",
      );
    }
    if (input.operation === "replace" || input.operation === "delete") {
      // Lookup exposes no offsets or containment tree. Refuse any matching rich
      // section rather than guessing whether the target is a cell or child block.
      const richTypes = sectionTypes.filter(
        (type) => !["any_header", "h1", "h2", "h3", "list", "blockquote", "horizontal_line"].includes(type),
      );
      // Slack's SDK documents at most three type filters per lookup.
      for (let offset = 0; offset < richTypes.length; offset += 3) {
        const richSections = await lookup(client, canvasId, {
          contains_text: input.containsText,
          section_types: richTypes.slice(offset, offset + 3),
        });
        if (richSections.length > 0) {
          throw new Error(
            "Unsupported edit target: lookup text matches a table or rich section. Canvas has no documented cell/text-range edit API; edit this content in Slack to preserve its formatting",
          );
        }
      }
    }
  }
  // Check content immediately before mutation. Slack has no documented conditional edit/revision parameter.
  const current = await contentFor(client, canvasId);
  if (current.snapshot !== input.expectedSnapshot) {
    throw new Error(
      "Canvas changed since it was read. Read Canvas again and review the intended change before editing",
    );
  }
  await call(client, "canvases.edit", {
    canvas_id: canvasId,
    changes: [
      {
        operation: input.operation,
        ...(targeted && { section_id: input.sectionId }),
        ...(input.operation !== "delete" && {
          [input.operation === "rename" ? "title_content" : "document_content"]: {
            type: "markdown",
            markdown: input.markdown,
          },
        }),
      },
    ],
  });
  try {
    return {
      canvasId,
      operation: input.operation,
      sectionId: input.sectionId,
      applied: true,
      ...(await contentFor(client, canvasId)),
    };
  } catch (error) {
    // Do not report a successful mutation as failed and invite a duplicate insertion.
    return {
      canvasId,
      operation: input.operation,
      sectionId: input.sectionId,
      applied: true,
      verificationError: error instanceof Error ? error.message : String(error),
    };
  }
}
