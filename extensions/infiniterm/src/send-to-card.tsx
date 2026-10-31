import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { CardList } from "./components/card-list.tsx";
import { sendToCard } from "./lib/ift.ts";
import type { Card } from "./lib/parse.ts";

function SendForm({ card }: { card: Card }) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle={`Send to #${card.number}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Send"
            icon={Icon.Terminal}
            onSubmit={async (values: { text: string; enter: boolean }) => {
              pop();
              await sendToCard(card, values.text, values.enter);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Card" text={`#${card.number}  ${card.cwd}`} />
      <Form.TextArea id="text" title="Text" placeholder="A command or any text" />
      <Form.Checkbox id="enter" label="Press Enter after the text" defaultValue={true} />
    </Form>
  );
}

export default function Command() {
  return (
    <CardList
      actions={(card) => (
        <ActionPanel>
          <Action.Push title="Send Text…" icon={Icon.Terminal} target={<SendForm card={card} />} />
        </ActionPanel>
      )}
    />
  );
}
