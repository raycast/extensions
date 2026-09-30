export const PR_DESCRIPTION_PROMPT = `You are a world class software engineer. I need your help writing a PR description, using this diff:
{diff}

Use this markdown template:
\`\`\`
## Summary

Provide a concise summary of the implemented changes, including new features, bug fixes, and any updates to components or properties.

## Changes

List the main changes made in this PR.
\`\`\`

Write a concise and clear PR description using the markdown template. Don't add any extra text to the response. Only respond in markdown.`;

export const COMMIT_MESSAGE_PROMPT = `Please write a commit message given the provided diff. The commit message should be a short description in the present tense and imperative form, as if giving a command. For example, "Add Button component" or "Fix issue with login form validation". IMPORTANT: The entire generated message should be 50 characters or less. Diff: `;
