/**
 * Extracts the git commit command from a given response string.
 *
 * This function searches for a pattern matching the git commit command
 * with a message enclosed in single quotes. If a match is found, it returns
 * the entire command; otherwise, it returns null.
 *
 * @param response - The string response from which to extract the commit command.
 *
 * @returns The git commit command if found, otherwise null.
 *
 * @example
 * const response = "The following command was executed: git commit -m 'Initial commit'";
 * const command = extractCommitCommand(response);
 * console.log(command); // Output: git commit -m 'Initial commit'
 */

export const extractCommitCommand = (response: string) => {
  const regex = /git commit -m ['"]([^'"]+)['"]/;
  const codeMatch = regex.exec(response);
  return codeMatch ? codeMatch[0] : null;
};
