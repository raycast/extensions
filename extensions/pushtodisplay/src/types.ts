/**
 * Types derived from `integrations/pushtodisplay-power/apiDefinition.swagger.json`
 * (authoritative for the send-update contract).
 */

export type TextSize = "small" | "medium" | "large";

export type FontWeight = "regular" | "semibold" | "bold";

export type Density = "compact" | "standard" | "spacious";

export type PanelId = 1 | 2 | 3 | 4;

export interface DisplayMessageBlock {
  /** The text content to display. */
  text: string;
  /** Size of the message text. */
  size?: TextSize;
  /** Weight (boldness) of the message text. */
  weight?: FontWeight;
  /** Text color in hex format (e.g. #FFFFFF for white). */
  color?: string;
  /** Background color applied directly behind the text (e.g. #0A0A0A). */
  background?: string;
}

export interface UpdateRequest {
  /** The board to update. If omitted, your default board is used. */
  boardId?: string;
  /** One or more content blocks. At least one block is required. */
  blocks: DisplayMessageBlock[];
  /** Which panel to update (1-4). Only needed for multi-panel layouts. Defaults to 1. */
  panelId?: PanelId;
  /** When true, the message fills the entire panel area. */
  fullPanel?: boolean;
  /** Controls the spacing between lines of text. */
  density?: Density;
  /** Horizontal alignment. */
  alignX?: "left" | "center" | "right";
}

export interface UpdateResponse {
  /** Unique identifier for this update. */
  messageId: string;
  /** UTC timestamp when the message was queued. */
  enqueuedAtUtc: string;
  /** The authenticated user who sent the update. */
  userId: string;
}

/**
 * Board summary for the picker. `GET /v1/boards` is documented by the CLI but
 * not the connector swagger — field names to be validated against the live API.
 */
export interface Board {
  id: string;
  name?: string;
  /** True when this board is the account default (used by Quick Send). */
  isDefault?: boolean;
}
