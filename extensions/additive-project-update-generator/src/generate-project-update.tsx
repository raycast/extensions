import { Form, ActionPanel, Action, showToast, Clipboard } from "@raycast/api";
type Values = {
  "textarea-reasoning": string;
  "textarea-summary": string;
  "textarea-blockers-and-risks": string;
  "textarea-next-steps": string;
  "dropdown-achievable": "dropdown-item-yes" | "dropdown-item-unclear" | "dropdown-item-no";
};

export default function Command() {
  function handleSubmit(values: Values) {
    let markdown = `# Current Target Date Assessment\n`;

    const achievable = mapAchievable(values["dropdown-achievable"]);

    markdown += `Achievable? ${achievable} \n`;
    markdown += `\n`;

    if (values["textarea-reasoning"]) {
      markdown += `**Reasoning:** \n${values["textarea-reasoning"]} \n`;
    }

    markdown += `---\n`;

    markdown += generateBlock("Summary of This Week:", values["textarea-summary"]);
    markdown += generateBlock("Blockers & Risks:", values["textarea-blockers-and-risks"]);
    markdown += generateBlock("Next Steps:", values["textarea-next-steps"]);

    Clipboard.copy(markdown);
    showToast({ title: "Generated project update into clipboard" });
  }

  function mapAchievable(v: Values["dropdown-achievable"]) {
    switch (v) {
      case "dropdown-item-yes":
        return "Yes";
      case "dropdown-item-unclear":
        return "Unclear";
      case "dropdown-item-no":
        return "No";
      default:
        return "Unspecified";
    }
  }

  function generateBlock(title: string, value: string) {
    let markdown = "";
    markdown += `### ${title}\n`;

    if (value) {
      markdown += `${value} \n`;
    }

    markdown += `---\n`;

    return markdown;
  }
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Generate a new project update." />

      <Form.Dropdown id="dropdown-achievable" title="Deadline achievable?">
        <Form.Dropdown.Item value="dropdown-item-yes" title="Yes" />
        <Form.Dropdown.Item value="dropdown-item-unclear" title="Unclear" />
        <Form.Dropdown.Item value="dropdown-item-no" title="No" />
      </Form.Dropdown>

      <Form.TextArea id="textarea-reasoning" title="Reasoning" placeholder="Reasoning" />

      <Form.TextArea id="textarea-summary" title="Summary of This Week" placeholder="Summary of This Week" />

      <Form.TextArea id="textarea-blockers-and-risks" title="Blocker & Risk" placeholder="Blocker & Risk" />

      <Form.TextArea id="textarea-next-steps" title="Next Steps" placeholder="Next Steps" />
    </Form>
  );
}
