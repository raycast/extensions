import { Tool } from "@raycast/api";
import {
  carrierType,
  createGroundPacket,
  draftFromInput,
} from "../domain/packet";
import { appendGroundPacket } from "../services/ledger";

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

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Save “${input.title?.trim() || "Untitled ground packet"}” to Ground Relay's local append-only ledger? Saving does not verify its claims or grant authority.`,
});

/**
 * Save a new Ground Relay packet locally after Raycast receives explicit human confirmation.
 * This creates a new root packet; corrections remain a regular-command workflow in v0.
 */
export default async function saveGroundPacket(input: Input): Promise<string> {
  const record = createGroundPacket(
    draftFromInput({ ...input, carrierType: carrierType(input.carrierType) }),
    { status: "ai-candidate" },
  );
  await appendGroundPacket(record);
  return JSON.stringify(
    {
      saved: true,
      id: record.id,
      version: record.version,
      authorityStatus: record.authorityStatus,
      message: "Saved locally. Claims remain advisory and unverified.",
    },
    null,
    2,
  );
}
