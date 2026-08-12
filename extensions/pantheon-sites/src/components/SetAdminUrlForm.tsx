import { ActionPanel, Form, Action, LocalStorage, useNavigation } from "@raycast/api";

export const SITE_ADMIN_URLS_KEY = "siteAdminUrls";

export function SetAdminUrlForm({
  siteName,
  currentUrl,
  onSave,
}: {
  siteName: string;
  currentUrl: string;
  onSave: (url: string) => void;
}) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { adminUrl: string }) {
    const raw = await LocalStorage.getItem<string>(SITE_ADMIN_URLS_KEY);
    const overrides: Record<string, string> = raw ? JSON.parse(raw) : {};
    if (values.adminUrl) {
      overrides[siteName] = values.adminUrl;
    } else {
      delete overrides[siteName];
    }
    await LocalStorage.setItem(SITE_ADMIN_URLS_KEY, JSON.stringify(overrides));
    onSave(values.adminUrl);
    pop();
  }

  return (
    <Form
      navigationTitle={`Admin URL for ${siteName}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="adminUrl"
        title="Admin URL Path"
        placeholder="/wp-admin/login.php"
        defaultValue={currentUrl}
        info="Leave blank to use the global default from preferences"
      />
    </Form>
  );
}
