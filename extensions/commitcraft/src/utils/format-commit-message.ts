import { CommitMessage } from "../types";

/**
 * Formats a commit message according to conventional commit guidelines.
 *
 * The format of the commit message will be:
 *
 * ```
 * type(scope): message
 *
 * [BREAKING CHANGE: body]
 *
 * [body]
 *
 * [footer]
 * ```
 *
 * @param {CommitMessage} param0 - The commit message components.
 * @param {string} param0.type - The type of the commit (e.g., feat, fix).
 * @param {string} [param0.scope] - The scope of the commit (optional).
 * @param {string} param0.message - The main message of the commit.
 * @param {boolean} param0.isBreaking - Indicates if the commit is a breaking change.
 * @param {string} [param0.body] - Additional information about the commit (optional).
 * @param {string} [param0.footer] - Any footer information (optional).
 *
 * @returns {string} The formatted commit message ready for a git command.
 *
 * @example
 * const commitMessage = formatCommitMessage({
 *   type: 'feat',
 *   scope: 'user',
 *   message: 'add new user login feature',
 *   isBreaking: true,
 *   body: 'This change will affect the user authentication flow.',
 *   footer: 'Related issue: #123'
 * });
 * // commitMessage will be:
 * // "git commit -m 'feat(user): add new user login feature\n\nBREAKING CHANGE: This change will affect the user authentication flow.\n\nRelated issue: #123'"
 */
export function formatCommitMessage({ type, scope, message, isBreaking, body, footer }: CommitMessage): string {
  // Start with the basic "type(scope): message"
  let fullMessage = `${type}${scope ? `(${scope})` : ""}: ${message}`;

  // Default bodyContent to an empty string if not provided
  let bodyContent = body ?? "";

  // If it's a breaking change, prepend "BREAKING CHANGE:"
  if (isBreaking) {
    if (bodyContent) {
      bodyContent = `BREAKING CHANGE: ${bodyContent}`;
    } else {
      bodyContent = "BREAKING CHANGE:";
    }
  }

  // Append bodyContent (if any) to the commit message (separated by blank lines)
  if (bodyContent) {
    fullMessage += `\n\n${bodyContent}`;
  }

  // Append footer (if any) to the commit message (also separated by blank lines)
  if (footer) {
    fullMessage += `\n\n${footer}`;
  }

  // Escape any single quotes so the final command won't break in a shell
  const escapedMessage = fullMessage.replace(/'/g, "'\\''");

  // Return the full git commit command
  return `git commit -m '${escapedMessage}'`;
}
