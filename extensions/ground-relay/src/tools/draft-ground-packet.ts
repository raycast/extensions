import {
  carrierType,
  createGroundPacket,
  draftFromInput,
} from "../domain/packet";

type Input = {
  /** Short name for the portable packet. */
  title?: string;
  /** Context type: project, person, team, organization, or other. Defaults to project. */
  carrierType?: string;
  /** What is happening now, in concrete terms. */
  situation: string;
  /** The specific, defended course of action being pursued; avoid aspirational slogans. */
  operativeIntent?: string;
  /** What this work must not become, assume, expose, or optimize away. */
  explicitRefusals?: string[];
  /** Real constraints shaping the reachable field. */
  constraints?: string[];
  /** Who may decide or change what, and what still requires review. */
  authorityBoundary?: string;
  /** What is inside and outside this packet's scope. */
  scopeBoundary?: string;
  /** Evidence lines formatted as: claim || source reference || observed-at. */
  evidence?: string[];
  /** Uncertainty lines prefixed with [solid], [inferential], or [unknown]. */
  uncertainties?: string[];
  /** The smallest reversible movement lawful now. */
  nextMove?: string;
  /** Receipts, authority, or conditions required before the next move. */
  nextMoveRequirements?: string[];
  /** Provenance and limits of the submitted context. */
  sourceContext?: string;
};

/**
 * Draft a portable Ground Relay packet without saving it. The output is advisory,
 * does not verify source references, and grants no authority.
 */
export default function draftGroundPacket(input: Input): string {
  const record = createGroundPacket(
    draftFromInput({ ...input, carrierType: carrierType(input.carrierType) }),
    { status: "ai-candidate" },
  );
  return JSON.stringify(record, null, 2);
}
