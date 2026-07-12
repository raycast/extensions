import { randomUUID } from "node:crypto";
import type {
  CarrierType,
  ContextGap,
  EvidenceItem,
  GroundPacketDraft,
  GroundPacketFormValues,
  GroundPacketInput,
  GroundPacketRecord,
  TypedUncertainty,
  UncertaintyClass,
} from "./types";

export function carrierType(value: string | undefined): CarrierType {
  if (
    value === "person" ||
    value === "team" ||
    value === "organization" ||
    value === "other"
  ) {
    return value;
  }
  return "project";
}

export function lines(value: string | undefined): string[] {
  return (value ?? "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseEvidence(values: string[]): EvidenceItem[] {
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => {
      const [claim = "", sourceRef = "", observedAt = ""] = value
        .split("||")
        .map((part) => part.trim());
      return {
        id: `e-${randomUUID()}`,
        claim,
        ...(sourceRef ? { sourceRef } : {}),
        ...(observedAt ? { observedAt } : {}),
        receiptBearing: Boolean(sourceRef),
      };
    });
}

function uncertaintyClass(value: string): UncertaintyClass {
  const normalized = value.toLowerCase();
  if (normalized === "solid" || normalized === "inferential") return normalized;
  return "unknown";
}

export function parseUncertainties(values: string[]): TypedUncertainty[] {
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => {
      const match = value.match(/^\[(solid|inferential|unknown)\]\s*(.*)$/i);
      return {
        classification: uncertaintyClass(match?.[1] ?? "unknown"),
        statement: (match?.[2] ?? value).trim(),
      };
    });
}

export function draftFromInput(input: GroundPacketInput): GroundPacketDraft {
  return {
    title: input.title?.trim() || "Untitled ground packet",
    carrierType: input.carrierType ?? "project",
    situation: input.situation.trim(),
    operativeIntent: input.operativeIntent?.trim() || "",
    explicitRefusals: input.explicitRefusals ?? [],
    constraints: input.constraints ?? [],
    authorityBoundary: input.authorityBoundary?.trim() || "",
    scopeBoundary: input.scopeBoundary?.trim() || "",
    evidence: parseEvidence(input.evidence ?? []),
    uncertainties: parseUncertainties(input.uncertainties ?? []),
    nextMove: input.nextMove?.trim() || "",
    nextMoveRequirements: input.nextMoveRequirements ?? [],
    sourceContext:
      input.sourceContext?.trim() ||
      "No external source context was independently verified.",
  };
}

export function draftFromForm(
  values: GroundPacketFormValues,
): GroundPacketDraft {
  return draftFromInput({
    ...values,
    explicitRefusals: lines(values.explicitRefusals),
    constraints: lines(values.constraints),
    evidence: lines(values.evidence),
    uncertainties: lines(values.uncertainties),
    nextMoveRequirements: lines(values.nextMoveRequirements),
  });
}

export function createGroundPacket(
  draft: GroundPacketDraft,
  options: {
    status?: GroundPacketRecord["status"];
    rootId?: string;
    version?: number;
    supersedesId?: string;
  } = {},
): GroundPacketRecord {
  const id = randomUUID();
  return {
    schemaVersion: 1,
    format: "ground-relay.packet",
    formatVersion: "1.0",
    ubiquityCompatibility: "candidate-compatible-not-admitted",
    id,
    rootId: options.rootId ?? id,
    version: options.version ?? 1,
    createdAt: new Date().toISOString(),
    ...(options.supersedesId ? { supersedesId: options.supersedesId } : {}),
    status: options.status ?? "user-authored",
    authorityStatus: "advisory-no-authority-grant",
    draft,
  };
}

export function findContextGap(draft: GroundPacketDraft): ContextGap {
  const receiptCount = draft.evidence.filter(
    (item) => item.receiptBearing,
  ).length;
  const gaps: Array<[boolean, ContextGap]> = [
    [
      !draft.situation,
      {
        field: "situation",
        question: "What is happening now, in concrete terms?",
        rationale:
          "Portable context needs a present situation before it can carry intent.",
      },
    ],
    [
      !draft.operativeIntent,
      {
        field: "operativeIntent",
        question:
          "What specific, costly course of action are you actually pursuing?",
        rationale:
          "An operative intent is more portable than an aspirational slogan.",
      },
    ],
    [
      draft.explicitRefusals.length === 0,
      {
        field: "explicitRefusals",
        question:
          "What must this work not become, assume, expose, or optimize away?",
        rationale:
          "A negative boundary narrows the field without forcing premature identity.",
      },
    ],
    [
      !draft.authorityBoundary,
      {
        field: "authorityBoundary",
        question:
          "Who may decide or change what, and what still requires review?",
        rationale:
          "Context without authority geometry invites accidental overreach.",
      },
    ],
    [
      receiptCount === 0,
      {
        field: "evidence",
        question:
          "Which claim can you connect to a source reference right now?",
        rationale:
          "A source-bearing claim travels more safely than a coherent recollection.",
      },
    ],
    [
      draft.uncertainties.length === 0,
      {
        field: "uncertainties",
        question:
          "What is solid, what is inferential, and what remains unknown?",
        rationale:
          "Typed uncertainty keeps portability from becoming false confidence.",
      },
    ],
    [
      !draft.nextMove,
      {
        field: "nextMove",
        question:
          "What is the smallest reversible movement that is lawful now?",
        rationale:
          "A packet should support motion without pretending the motion is final.",
      },
    ],
  ];
  return (
    gaps.find(([missing]) => missing)?.[1] ?? {
      field: "correction",
      question: "What would falsify or materially correct this packet?",
      rationale:
        "A complete first pass becomes trustworthy only by surviving correction.",
    }
  );
}
