import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { commitStore } from "./lib/apply";
import { strings } from "./lib/strings";
import type { HostsStore } from "./lib/storage";

interface CommonConfigFormProps {
  store: HostsStore;
  /** Current public section, read from /etc/hosts. */
  content: string;
  onDone: () => Promise<void> | void;
}

export function CommonConfigForm({
  store,
  content,
  onDone,
}: CommonConfigFormProps) {
  const { pop } = useNavigation();
  const s = strings;

  async function handleSubmit(values: { content: string }) {
    const saved = await commitStore({
      previous: store,
      next: store,
      sync: true,
      successTitle: s.publicConfigurationSaved,
      commonContent: values.content,
      keepFileProfile: true,
    });
    if (saved) {
      await onDone();
      pop();
    }
  }

  return (
    <Form
      navigationTitle={s.editPublicConfiguration}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={s.save} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="content"
        title={s.contentField}
        placeholder={"127.0.0.1 localhost"}
        defaultValue={content}
      />
    </Form>
  );
}
