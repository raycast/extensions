import gitmoji from "../data/gitmoji";

type Input = {
  /**
   * Conventional commit type (for example: feat, fix, docs, chore, refactor).
   */
  type: string;
  /**
   * Commit description in imperative mood.
   */
  description: string;
  /**
   * Optional scope for additional context.
   */
  scope?: string;
  /**
   * Optional body with extra details.
   */
  body?: string;
  /**
   * Output format template. Supported placeholders: {emoji}, {type}, {scope}, {description}.
   */
  format?: string;
  /**
   * Whether this commit introduces a breaking change.
   */
  breakingChange?: boolean;
  /**
   * Breaking change details. Required when breakingChange is true.
   */
  breakingChangeInfo?: string;
};

/**
 * Generate a conventional commit message with optional gitmoji format.
 */
export default function tool(input: Input) {
  const typeKey = input.type.trim();
  const description = input.description.trim();

  if (!typeKey) {
    throw new Error("Type is required.");
  }

  if (!description) {
    throw new Error("Description is required.");
  }

  const typeConfig = gitmoji.types[typeKey];
  if (!typeConfig) {
    const availableTypes = Object.keys(gitmoji.types).join(", ");
    throw new Error(`Unknown type "${typeKey}". Use one of: ${availableTypes}`);
  }

  const format = (input.format?.trim() ?? gitmoji.format).toString();
  const scope = input.scope?.trim();
  const hasTypeToken = format.includes("type");

  const header = format
    .replace(/\{emoji\}/g, scope || hasTypeToken ? `${typeConfig.emoji} ` : `${typeConfig.emoji}`)
    .replace(/\{scope\}/g, scope ? `(${scope})` : "")
    .replace(/\{description\}/g, description)
    .replace(/\{type\}/g, typeConfig.commit);

  const body = input.body?.trim();
  let message = body ? `${header}\n\n${body}` : header;

  if (input.breakingChange) {
    const breakingChangeInfo = input.breakingChangeInfo?.trim();

    if (!breakingChangeInfo) {
      throw new Error("breakingChangeInfo is required when breakingChange is true.");
    }

    const breakingIdentifier = format.includes("emoji") ? "💥️ " : "";
    message = `${message}\n\nBREAKING CHANGE: ${breakingIdentifier}${breakingChangeInfo}`;
  }

  return message;
}
