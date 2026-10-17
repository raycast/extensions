import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";

export function PresetNameForm({
  title,
  defaultName,
  onSubmit,
}: {
  title: string;
  defaultName?: string;
  onSubmit: (name: string) => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [error, setError] = useState<string>();

  return (
    <Form
      navigationTitle={title}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={title}
            icon={Icon.SaveDocument}
            onSubmit={async (values: { name: string }) => {
              const name = values.name.trim();
              if (!name) {
                setError("Name is required");
                return;
              }
              try {
                await onSubmit(name);
                pop();
              } catch (e) {
                await showFailureToast(e, { title: "Could not save preset" });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Calm Birds"
        defaultValue={defaultName}
        error={error}
        onChange={() => setError(undefined)}
        autoFocus
      />
    </Form>
  );
}
