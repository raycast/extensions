import { carrierType, draftFromInput, findContextGap } from "../domain/packet";

type Input = {
  /** Short name for the portable packet. */
  title?: string;
  /** Context type: project, person, team, organization, or other. */
  carrierType?: string;
  /** What is happening now, in concrete terms. */
  situation: string;
  /** The specific course of action being pursued. */
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
 * Find one material gap in a proposed Ground Relay packet. This is not a score,
 * readiness gate, or assessment of the carrier.
 */
export default function findGap(input: Input): string {
  return JSON.stringify(
    findContextGap(
      draftFromInput({ ...input, carrierType: carrierType(input.carrierType) }),
    ),
    null,
    2,
  );
}
