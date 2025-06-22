import { Action, ActionPanel, Clipboard, Detail, Form, popToRoot, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const { push } = useNavigation();

  const [type, setType] = useState("feat");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [bullets, setBullets] = useState([""]);
  const [issue, setIssue] = useState("");
  const [issuePrefix, setIssuePrefix] = useState("See");

  function wrapText(text: string, width = 72): string {
    return text
      .split("\n")
      .map((line) => (line.length <= width ? line : (line.match(new RegExp(`.{1,${width}}`, "g"))?.join("\n") ?? line)))
      .join("\n");
  }

  function capitalizeFirstLetter(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function generateCommitMessage() {
    const bulletList = bullets
      .filter(Boolean)
      .map((b) => `- ${b.trim()}`)
      .join("\n");
    const cleanedSummary = capitalizeFirstLetter(summary.trim());
    const wrappedBody = body ? wrapText(body.trim()) + "\n\n" : "";
    return `${type}: ${cleanedSummary}\n\n${wrappedBody}${bulletList}\n\n${issuePrefix} #${issue}`;
  }

  function validate(): string[] {
    const errors: string[] = [];
    const trimmedSummary = summary.trim();
    const nonImperativeStarters = ["Added", "Fixed", "Updated", "Changed", "Created"];

    if (!trimmedSummary) errors.push("Summary is required.");
    if (trimmedSummary.length > 50) errors.push("Summary must be 50 characters or less.");
    if (trimmedSummary.endsWith(".")) errors.push("Summary must not end with a period.");
    if (!/^[A-Za-z]/.test(trimmedSummary)) errors.push("Summary must start with a letter.");
    if (nonImperativeStarters.some((word) => trimmedSummary.startsWith(word)))
      errors.push("Use imperative mood (e.g., 'Add', 'Fix', 'Refactor').");
    if (!bullets.filter(Boolean).length) errors.push("At least one bullet point is required.");
    if (!/^\d+$/.test(issue)) errors.push("Issue number must be a number.");

    return errors;
  }

  function handlePreview() {
    const errors = validate();
    if (errors.length > 0) {
      showToast({ style: Toast.Style.Failure, title: "Validation Failed", message: errors.join(" ") });
      return;
    }

    push(<Preview commit={generateCommitMessage()} />);
  }

  return (
    <Form
      navigationTitle="Create Git Commit"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Preview Commit Message" onSubmit={handlePreview} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="type" title="Commit Type" value={type} onChange={setType}>
        <Form.Dropdown.Item value="feat" title="feat - New feature" />
        <Form.Dropdown.Item value="fix" title="fix - Bug fix" />
        <Form.Dropdown.Item value="docs" title="docs - Documentation" />
        <Form.Dropdown.Item value="style" title="style - Code style change" />
        <Form.Dropdown.Item value="refactor" title="refactor - Code refactor" />
        <Form.Dropdown.Item value="test" title="test - Adding tests" />
        <Form.Dropdown.Item value="chore" title="chore - Maintenance" />
      </Form.Dropdown>

      <Form.Description text="Use imperative mood, no period." />

      <Form.TextField
        id="summary"
        title={`Summary (${summary.trim().length}/50)`}
        placeholder="Add login screen"
        value={summary}
        onChange={(v) => setSummary(v.replace(/^./, (c) => c.toUpperCase()))}
      />

      <Form.TextArea
        id="body"
        title="Body (optional)"
        placeholder="Explain what changes you made and why"
        value={body}
        onChange={setBody}
      />

      {bullets.map((b, i) => (
        <Form.TextField
          key={i}
          id={`bullet-${i}`}
          title={`Key point ${i + 1}`}
          placeholder="Change form validation"
          value={b}
          onChange={(value) => {
            const newBullets = [...bullets];
            newBullets[i] = value;
            if (i === bullets.length - 1 && value.trim()) newBullets.push("");
            setBullets(newBullets);
          }}
        />
      ))}

      <Form.Dropdown id="issuePrefix" title="Issue Reference Type" value={issuePrefix} onChange={setIssuePrefix}>
        <Form.Dropdown.Item value="See" title="See" />
        <Form.Dropdown.Item value="Fixes" title="Fixes" />
        <Form.Dropdown.Item value="Resolves" title="Resolves" />
        <Form.Dropdown.Item value="Closes" title="Closes" />
        <Form.Dropdown.Item value="Relates to" title="Relates to" />
      </Form.Dropdown>

      <Form.TextField id="issue" title="Issue Number" placeholder="42" value={issue} onChange={setIssue} />
    </Form>
  );
}

function Preview({ commit }: { commit: string }) {
  async function handleCopy() {
    await Clipboard.copy(commit);
    await showToast({ style: Toast.Style.Success, title: "Copied to clipboard" });
    await popToRoot();
  }

  return (
    <Detail
      markdown={`\`\`\`md\n${commit}\n\`\`\``}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Copy to Clipboard" onSubmit={handleCopy} />
        </ActionPanel>
      }
    />
  );
}
