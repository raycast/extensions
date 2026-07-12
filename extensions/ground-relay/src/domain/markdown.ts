import type { GroundPacketRecord } from "./types";

function list(values: string[], empty = "None stated"): string {
  return values.length
    ? values.map((value) => `- ${value}`).join("\n")
    : `- ${empty}`;
}

export function renderGroundPacketMarkdown(record: GroundPacketRecord): string {
  const { draft } = record;
  const evidence = draft.evidence.length
    ? draft.evidence
        .map(
          (item) =>
            `- ${item.receiptBearing ? "Receipt-bearing" : "Unlinked"}: ${item.claim}${item.sourceRef ? ` — ${item.sourceRef}` : ""}${item.observedAt ? ` (${item.observedAt})` : ""}`,
        )
        .join("\n")
    : "- No evidence stated";
  const uncertainty = draft.uncertainties.length
    ? draft.uncertainties
        .map((item) => `- **${item.classification}:** ${item.statement}`)
        .join("\n")
    : "- No uncertainty typed";

  return `# ${draft.title}

> Ground Relay packet v${record.version} · ${record.status} · ${record.authorityStatus}

## Situation

${draft.situation || "Not stated"}

## Operative Intent

${draft.operativeIntent || "Not stated"}

## Explicit Refusals

${list(draft.explicitRefusals)}

## Constraints

${list(draft.constraints)}

## Authority Boundary

${draft.authorityBoundary || "Not stated"}

## Scope Boundary

${draft.scopeBoundary || "Not stated"}

## Evidence

${evidence}

## Typed Uncertainty

${uncertainty}

## Next Move

${draft.nextMove || "Not stated"}

### Requirements

${list(draft.nextMoveRequirements)}

## Source Context

${draft.sourceContext}
${draft.correctionReason ? `\n## Correction Pressure\n\n${draft.correctionReason}\n` : ""}
## Portability Contract

- Format: \`${record.format}\` \`${record.formatVersion}\`
- Ubiquity compatibility: \`${record.ubiquityCompatibility}\`
- Compatibility does not mean admission, verification, authority, or onboarding.
- The JSON record preserves exact fields and correction lineage.

## Lineage

- Record: \`${record.id}\`
- Root: \`${record.rootId}\`
- Version: ${record.version}
${record.supersedesId ? `- Supersedes: \`${record.supersedesId}\`` : "- Supersedes: none"}
- Created: ${record.createdAt}
`;
}
