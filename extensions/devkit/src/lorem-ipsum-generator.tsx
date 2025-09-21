import { Form, ActionPanel, showToast, Toast, Clipboard, Action } from "@raycast/api";
import { faker } from "@faker-js/faker";

export default function Command() {
  async function handleSubmit(values: { type: string; count: string }) {
    const type = values.type;
    const count = parseInt(values.count) || 1;

    let result: string;
    switch (type) {
      case "paragraphs":
        result = faker.lorem.paragraphs(count);
        break;
      case "sentences":
        result = faker.lorem.sentences(count);
        break;
      case "words":
        result = faker.lorem.words(count);
        break;
      default:
        result = faker.lorem.paragraph();
    }

    await Clipboard.copy(result);
    await showToast(Toast.Style.Success, "Lorem ipsum text copied to clipboard");
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Lorem Ipsum" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="type" title="Type">
        <Form.Dropdown.Item value="paragraphs" title="Paragraphs" />
        <Form.Dropdown.Item value="sentences" title="Sentences" />
        <Form.Dropdown.Item value="words" title="Words" />
      </Form.Dropdown>
      <Form.TextField id="count" title="Count" placeholder="1" defaultValue="1" />
    </Form>
  );
}
