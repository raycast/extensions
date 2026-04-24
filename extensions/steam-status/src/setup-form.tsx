import { Action, ActionPanel, Form } from "@raycast/api";
import { useForm, FormValidation, useLocalStorage } from "@raycast/utils";

interface SignUpFormValues {
  steamId: string;
  steamApiKey: string;
}

export default function SetupForm() {
  const { value: steamId, setValue: setSteamId } = useLocalStorage<string>("user-id");
  const { value: steamApiKey, setValue: setSteamApiKey } = useLocalStorage<string>("api-key");

  const { handleSubmit, itemProps } = useForm<SignUpFormValues>({
    async onSubmit(values) {
      setSteamId(values.steamId);
      setSteamApiKey(values.steamApiKey);
    },
    validation: {
      steamId: FormValidation.Required,
      steamApiKey: FormValidation.Required,
    },
    initialValues: {
      steamId,
      steamApiKey,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Steam Profile ID" {...itemProps.steamId} />
      <Form.PasswordField title="Steam API Key" {...itemProps.steamApiKey} />
    </Form>
  );
}
