import { Action, ActionPanel, Form, open, popToRoot } from "@raycast/api";

type Values = {
  query: string;
  copilot: boolean;
  focus: string;
};

export default function Command() {
  function handleSubmit({ query: q, copilot, focus }: Values) {
    const params = new URLSearchParams({
      q,
      copilot: copilot.toString(),
      focus,
    });
    popToRoot();
    open(`https://www.perplexity.ai/search?${params}`);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Where knowledge begins" />
      <Form.TextArea id="query" title="Ask anything..." autoFocus />
      <Form.Dropdown
        info="Focus allows you to fine tune your search by narrowing down the sources, for more targeted and relevant results. All follow-up questions in this Thread will focus the search on your chosen domain."
        id="focus"
        title="Focus"
      >
        <Form.Dropdown.Item value="all" title="All" />
        <Form.Dropdown.Item value="scholar" title="Academic" />
        <Form.Dropdown.Item value="writing" title="Writing" />
        <Form.Dropdown.Item value="wolfram" title="Wolfram Alpha" />
        <Form.Dropdown.Item value="youtube" title="Youtube" />
        <Form.Dropdown.Item value="reddit" title="Reddit" />
      </Form.Dropdown>
      <Form.Separator />
      <Form.Checkbox defaultValue={false} id="copilot" label="Co-pilot" storeValue />
    </Form>
  );
}
