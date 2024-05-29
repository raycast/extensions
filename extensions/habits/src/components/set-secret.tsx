import { Action, ActionPanel, Cache, Form, useNavigation } from "@raycast/api";

const cache = new Cache();

export default function SetSecret() {
  const { pop } = useNavigation();

  const markdownSettingsDetails = `
1. Create an account on [SupaHabits](https://www.supahabits.com) if you haven't already.
2. Go to your [profile](https://www.supahabits.com/profile) page.
3. Generate a new Secret Key
4. Copy the Secret Key and use it in the extension.
    `;

  const saveSecret = async (values: { secret: string }) => {
    cache.set("secret", values.secret);
    pop();
  };

  return (
    <Form
      searchBarAccessory={<Form.LinkAccessory target="https://www.supahabits.com/profile" text="Generate secret Key" />}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save secret key" onSubmit={saveSecret} />
          <Action.OpenInBrowser
            title="Generate secret key"
            url="https://www.supahabits.com/profile"
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Add your secret key" text={markdownSettingsDetails} />
      <Form.TextArea id="secret" title="Secret Key" />
    </Form>
  );
}
