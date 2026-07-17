import { Action, Icon, ActionPanel, Form, LaunchProps, open, popToRoot, Color } from "@raycast/api";
import { useForm } from "@raycast/utils";

type Values = {
  query: string;
  chatMode: string;
};

export default function Command(props: LaunchProps<{ draftValues: Values }>) {
  const { handleSubmit, itemProps } = useForm<Values>({
    onSubmit({ query, chatMode }) {
      const params = new URLSearchParams({
        q: query,
        tbm: "youchat",
        chatMode,
      });
      popToRoot();
      open(`https://you.com/search?${params}`);
    },
    initialValues: {
      query: props.draftValues?.query ?? "",
      chatMode: props.draftValues?.chatMode ?? "default",
    },
    validation: {
      query: (value) => (value && value.length > 0 ? null : "Query cannot be empty"),
    },
  });

  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Get answers anywhere" />
      <Form.TextArea title="Ask anything..." {...itemProps.query} />
      <Form.Dropdown
        title="Chat Mode"
        info="AI modes — including Smart, Genius, Research, Custom, and Create — designed to deliver answers with unparalleled accuracy, transparency, and citations in an intuitive and user-friendly manner."
        {...itemProps.chatMode}
      >
        <Form.Dropdown.Item
          value="default"
          title="Smart - free default mode"
          icon={{ source: Icon.LightBulb, tintColor: Color.Purple }}
        />
        <Form.Dropdown.Item value="agent" title="⚡️ Genius - multistep computational abilities" />
        <Form.Dropdown.Item
          value="research"
          title="⚡️ Research - comprehensive yet digestible reports with extensive source"
        />
        <Form.Dropdown.Item value="custom" title="⚡️ Custom - Select a custom model " />
        <Form.Dropdown.Item value="create" title="⚡️ Create - transforms any concept into an AI image" />
      </Form.Dropdown>
      <Form.Separator />
      <Form.Description text="Learn more about AI modes:" />
      <Form.Description text="https://about.you.com/introducing-ai-modes-elevating-how-you-use-ai-on-youdotcom/" />
    </Form>
  );
}
