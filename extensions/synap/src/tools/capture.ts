import { captureStructure, requireAgentConnection, submitCaptureGraph } from "../api/client";
import { parseJsonArray } from "./property-json";
import type { CaptureGraphEntity, CaptureGraphRelation } from "@synap/hub-rest-client";

type Input = {
  /** Free-form text to parse (max 8000 chars). If you ALSO send entities, this text is kept as provenance. */
  text?: string;
  /**
   * Structured payload as a JSON array string of entities. Each needs profileSlug.
   * Same gradient as MCP synap_capture.entities[].
   */
  entities?: string;
  /** Graph edges as a JSON array string. Both refs must name entities in this same call. */
  relations?: string;
  /** One line the reviewer sees on the proposal card. */
  summary?: string;
  /**
   * GLOBAL lane: pod-wide runbook. Not yet on HubRestClient — this tool refuses
   * it rather than inventing a second write path. Use `synap capture --global`.
   */
  global?: boolean;
  /** Scope to a specific workspace ID only when the user named or selected it. */
  workspaceId?: string;
  /** Optional project id to file created entities into. */
  projectId?: string;
};

/**
 * The ONE capture door. Hand it raw material that needs interpretation — a
 * conversation excerpt, note, page, or bundle of facts — and this tool does the
 * whole thing deterministically: it structures the text, then submits the
 * resulting graph as ONE governed composite write. There is no separate commit
 * step to remember; the call returns a definitive outcome.
 *
 * Raycast AI tools authenticate with a dedicated agent key, so the pod runs this
 * in agent mode: policy auto-applies a fully safe graph (`status: "applied"`) or
 * queues it for review (`status: "proposed"`, with a `reviewUrl`). Either way the
 * write is real and traceable — never report success without one of these.
 *
 * Do not use this as a fallback after a direct create error: report that error
 * instead. When the type and fields are known, use create-entity. The only
 * outcomes that write NOTHING are the genuine pauses below: `needsClarification`
 * (ask the user first) and `degraded` (AI structurer down).
 */
function assignRefs(entities: CaptureGraphEntity[]): CaptureGraphEntity[] {
  const used = new Set(entities.map((e) => e.ref).filter(Boolean));
  let n = 0;
  return entities.map((entity) => {
    if (entity.ref) return entity;
    let ref = `e${++n}`;
    while (used.has(ref)) ref = `e${++n}`;
    used.add(ref);
    return { ...entity, ref };
  });
}

function parseEntities(raw: string | undefined): CaptureGraphEntity[] {
  const parsed = parseJsonArray(raw, "entities");
  if (!parsed) return [];
  return parsed.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`entities[${index}] must be an object.`);
    }
    const row = item as Record<string, unknown>;
    if (typeof row.profileSlug !== "string" || !row.profileSlug) {
      throw new Error(`entities[${index}].profileSlug is required.`);
    }
    return {
      ref: typeof row.ref === "string" ? row.ref : "",
      profileSlug: row.profileSlug,
      title: typeof row.title === "string" ? row.title : undefined,
      description: typeof row.description === "string" ? row.description : undefined,
      content: typeof row.content === "string" ? row.content : undefined,
      properties:
        row.properties && typeof row.properties === "object" && !Array.isArray(row.properties)
          ? (row.properties as Record<string, unknown>)
          : undefined,
      existingEntityId: typeof row.existingEntityId === "string" ? row.existingEntityId : undefined,
      facets: Array.isArray(row.facets)
        ? row.facets.map((facet) => {
            const f = facet as Record<string, unknown>;
            return {
              profileSlug: String(f.profileSlug ?? ""),
              status: typeof f.status === "string" ? f.status : undefined,
              properties:
                f.properties && typeof f.properties === "object" && !Array.isArray(f.properties)
                  ? (f.properties as Record<string, unknown>)
                  : undefined,
              contextRef: typeof f.contextRef === "string" ? f.contextRef : undefined,
            };
          })
        : undefined,
    };
  });
}

function parseRelations(raw: string | undefined): CaptureGraphRelation[] {
  const parsed = parseJsonArray(raw, "relations");
  if (!parsed) return [];
  return parsed.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`relations[${index}] must be an object.`);
    }
    const row = item as Record<string, unknown>;
    if (typeof row.sourceRef !== "string" || typeof row.targetRef !== "string" || typeof row.type !== "string") {
      throw new Error(`relations[${index}] needs sourceRef, targetRef, and type.`);
    }
    return { sourceRef: row.sourceRef, targetRef: row.targetRef, type: row.type };
  });
}

export default async function tool(input: Input) {
  await requireAgentConnection();

  if (input.global === true) {
    return {
      executed: false,
      status: "unsupported" as const,
      message:
        "global:true is the pod-wide runbook lane. It is not on HubRestClient yet — use `synap capture --global` rather than a second write path. Drop global to capture entities or text.",
    };
  }

  const structuredEntities = assignRefs(parseEntities(input.entities));
  const structuredRelations = parseRelations(input.relations);

  if (structuredEntities.length > 0) {
    const refs = new Set(structuredEntities.map((entity) => entity.ref));
    const dangling = structuredRelations.filter((rel) => !refs.has(rel.sourceRef) || !refs.has(rel.targetRef));
    if (dangling.length > 0) {
      throw new Error("Every relation sourceRef/targetRef must name an entity in this same call.");
    }
    const result = await submitCaptureGraph({
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      source: "raycast",
      rawSource: input.text ? { rawText: input.text, label: "Raycast AI capture" } : undefined,
      entities: structuredEntities,
      relations: structuredRelations,
      summary: input.summary,
    });
    const applied = result.writeReceipt?.state === "applied";
    return {
      status: applied ? ("applied" as const) : ("proposed" as const),
      proposalId: result.proposalId,
      reviewUrl: result.reviewUrl,
      entityCount: result.entityCount,
      relationCount: result.relationCount,
      summary: result.summary,
      message: applied
        ? `Captured **${result.summary}** — applied to the pod.`
        : result.reviewUrl
          ? `Queued **${result.summary}** for your review. Approve: ${result.reviewUrl}`
          : `Queued **${result.summary}** for review (proposalId: ${result.proposalId ?? "unknown"}).`,
    };
  }

  if (!input.text?.trim()) {
    return { executed: false, note: "Nothing to capture — send text or entities[]." };
  }

  const structured = await captureStructure({
    text: input.text,
    workspaceId: input.workspaceId,
  });

  // The capture pipeline may return a clarifying question (`followUp`) — now an
  // object `{ question, suggestions }` (historically a string). Extract it.
  const fu = structured.followUp as unknown;
  const question =
    typeof fu === "string"
      ? fu
      : fu && typeof fu === "object"
        ? ((fu as { question?: string }).question ?? null)
        : null;

  // ── Degraded: the IS structurer is down. The pod returns a raw-note fallback
  // with `degraded: true`. Create NOTHING (an outage note is exactly the
  // unwanted artifact) and tell the user the AI service is temporarily down.
  if ((structured as { degraded?: boolean }).degraded === true) {
    return {
      executed: false,
      degraded: true,
      message:
        "AI structuring is temporarily unavailable, so nothing was captured. Tell the user the AI service is down and to retry shortly.",
    };
  }

  const proposals = structured.proposals ?? [];

  // ── UNCERTAIN — the pipeline couldn't decide what to create (no proposals)
  // but has a clarifying question. Create NOTHING; ask first. The model relays
  // the question and, after the answer, re-captures with it appended — that pass
  // has enough context to produce proposals.
  if (proposals.length === 0) {
    if (question) {
      return {
        executed: false,
        needsClarification: true,
        question,
        message: question,
        nextStep:
          "Ask the user this question verbatim and WAIT — create nothing yet. " +
          "After they answer, call capture again with `text` = the original text + '\\n\\nAnswer: ' + their answer.",
      };
    }
    return { executed: false, note: "Nothing to capture from that text." };
  }

  const unresolvedLinks = proposals.filter((proposal) => proposal.action === "link" && !proposal.linkedEntityId);
  if (unresolvedLinks.length > 0) {
    return {
      executed: false,
      needsClarification: true,
      message:
        "The capture plan includes an unresolved existing-entity link. Ask the user to identify the existing entity, then run capture again with that answer.",
      unresolvedLinks: unresolvedLinks.map((proposal) => ({
        tempId: proposal.tempId,
        title: proposal.title,
        profileSlug: proposal.profileSlug,
      })),
    };
  }

  // The capture structure contract is additive. Preserve rich content and role
  // facets when supplied by a newer pod — CaptureProposal already types them, so
  // they pass straight through to the graph write without Raycast interpreting
  // or materializing those records itself.
  const entities = proposals
    .filter((proposal) => proposal.action !== "dismiss")
    .map((proposal) => ({
      ref: proposal.tempId,
      profileSlug: proposal.profileSlug,
      title: proposal.title,
      description: proposal.description,
      content: proposal.content,
      properties: proposal.properties,
      existingEntityId: proposal.linkedEntityId,
      facets: proposal.facets?.map((facet) => ({
        profileSlug: facet.profileSlug,
        status: facet.status,
        properties: facet.properties,
        contextRef: facet.contextTempId,
      })),
    }));
  const refs = new Set(entities.map((entity) => entity.ref));
  const relations = (structured.relations ?? [])
    .filter((relation) => refs.has(relation.sourceTempId) && refs.has(relation.targetTempId))
    .map((relation) => ({
      sourceRef: relation.sourceTempId,
      targetRef: relation.targetTempId,
      type: relation.relationType,
    }));

  // Submit the graph in the SAME call — no plan handed back for a follow-up
  // commit to forget. The pod's agent-mode policy decides apply-vs-propose.
  const result = await submitCaptureGraph({
    workspaceId: input.workspaceId ?? structured.targetWorkspaceId ?? undefined,
    projectId: input.projectId ?? structured.targetProjectId ?? undefined,
    source: "raycast",
    rawSource: { rawText: input.text, label: "Raycast AI capture" },
    entities,
    relations,
    summary:
      input.summary ??
      `Capture ${entities.length} entit${entities.length === 1 ? "y" : "ies"} and ${relations.length} link${relations.length === 1 ? "" : "s"}.`,
  });

  const applied = result.writeReceipt?.state === "applied";
  const status = applied ? "applied" : "proposed";
  const projectCandidate = (result as { projectCandidate?: { name: string } }).projectCandidate;

  return {
    status,
    proposalId: result.proposalId,
    reviewUrl: result.reviewUrl,
    entityCount: result.entityCount,
    relationCount: result.relationCount,
    summary: result.summary,
    ...(projectCandidate ? { projectCandidate } : {}),
    message: applied
      ? `Captured **${result.summary}** — applied to the pod.`
      : result.reviewUrl
        ? `Queued **${result.summary}** for your review. Approve: ${result.reviewUrl}`
        : `Queued **${result.summary}** for review (proposalId: ${result.proposalId ?? "unknown"}).`,
  };
}
