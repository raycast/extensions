import { open, closeMainWindow, showHUD, ActionPanel, Form, Action, getPreferenceValues } from "@raycast/api";
import { SessionInstallationCheck } from "./checkInstall";

const submitSession = async (values: { intent: string; duration: string; notes: string; category: string }) => {
  if (await SessionInstallationCheck()) {
    // https://www.stayinsession.com/learn/session-url-scheme
    const urlScheme = "session:///start";
    const paramsArray = [
      `intent=${values.intent}` ?? null,
      `duration=${values.duration}` ?? null,
      `notes=${values.notes}` ?? null,
      `categoryName=${values.category}` ?? null,
    ];
    const queryString = paramsArray.join("&");
    const url = `${urlScheme}?${queryString}`;
    open(url);
    await closeMainWindow();
    await showHUD("New session started ⏲️");
  }
};

export default function Command() {
  const preferences = getPreferenceValues();

  const CategoryField = () => {
    if (preferences.categoryList) {
      let categoryListParsed = preferences.categoryList.split(";");
      categoryListParsed = categoryListParsed.filter((d: string) => d.trim() !== "");
      return (
        <Form.Dropdown id="category" title="Category">
          {categoryListParsed.map((category: string) => (
            <Form.Dropdown.Item value={category} title={category} />
          ))}
        </Form.Dropdown>
      );
    } else {
      return (
        <Form.Description
          title="Category"
          text="No category list configured. Please create a semi-colon separated list of categories to choose from in command preferences."
        />
      );
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Session" onSubmit={submitSession} />
        </ActionPanel>
      }
    >
      <Form.TextField id="intent" title="Intent" autoFocus />
      <CategoryField />
      <Form.TextField id="duration" title="Duration (Minutes)" placeholder="Leave blank for default value" />
      <Form.TextArea id="notes" title="Notes" />
    </Form>
  );
}
