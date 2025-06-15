import { Form, copyTextToClipboard, closeMainWindow, ActionPanel, SubmitFormAction, showHUD } from "@raycast/api";

interface CommitType {
  [key: string]: string;
}

interface CommitValues {
  type: string;
  scope?: string;
  subject?: string;
  body?: string;
  footer?: string;
}

const commitTypes: CommitType = {
  build: "build(build system or external dependencies changes)",
  ci: "ci(CI configurations and scripts changes)",
  docs: "docs(documentation)",
  feat: "feat(feature)",
  fix: "fix(bug fix)",
  perf: "perf(improves performance)",
  refactor: "refactor(restructuring existing code, but not bug or feature)",
  revert: "revert(reverts a previous commit)",
  style: "style(formatting, missing semi colons, etc.)",
  test: "test(adding missing tests)",
};

export default function Command() {
  async function handleSubmit(values: CommitValues) {
    const { type, scope, subject, body, footer } = values;

    let commitMessage = `${type}`;
    if (scope) {
      commitMessage += `(${scope})`;
    }
    commitMessage += ": ";
    if (subject) {
      commitMessage += subject;
    }
    if (body) {
      commitMessage += `\n\n${body}`;
    }
    if (footer) {
      commitMessage += `\n\n${footer}`;
    }

    await copyTextToClipboard(commitMessage);
    closeMainWindow();
    showHUD("Copied to Clipboard");
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Copy to Clipboard" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="type" title="Type" defaultValue="feat">
        {Object.keys(commitTypes).map((k: string) => (
          <Form.Dropdown.Item value={k} title={commitTypes[k]} key={k} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="scope" title="Scope" placeholder="scope (optional)" />
      <Form.TextField id="subject" title="Subject" placeholder="description of the change" />
      <Form.TextArea id="body" title="Body" placeholder="detailed explanatory text (optional)" />
      <Form.TextField id="footer" title="Footer" placeholder="breaking changes and ref. issues (optional)" />
    </Form>
  );
}
