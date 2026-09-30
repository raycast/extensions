type Input = {
  /**
   * The comment label (for example: suggestion, question, praise, nitpick, issue, thought, chore).
   */
  label: string;
  /**
   * A short subject line that summarizes the comment.
   */
  subject: string;
  /**
   * The comment body with supporting details.
   */
  content?: string;
};

/**
 * Generate a conventional review comment.
 */
export default function tool(input: Input) {
  const label = input.label.trim().toLowerCase();
  const subject = input.subject.trim();
  const content = input.content?.trim();

  if (!label) {
    throw new Error("Label is required.");
  }

  if (!subject) {
    throw new Error("Subject is required.");
  }

  return content ? `${label}: ${subject}\n\n${content}` : `${label}: ${subject}`;
}
