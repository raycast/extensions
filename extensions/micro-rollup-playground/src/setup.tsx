import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import MainMenu from "./main-menu";
import { addToStore, API_URL, PRIVATE_KEY } from "./utils/storage";
import { hasValidCredentials } from "./utils/helpers";

export function Setup() {
  const { push } = useNavigation();

  async function handleSubmit(values: { apiUrl: string; privateKey: string }) {
    const { apiUrl, privateKey } = values;
    if (!apiUrl) {
      showToast({
        style: Toast.Style.Failure,
        title: "Missing Playground API URL",
      });
      return;
    }

    if (!privateKey) {
      showToast({
        style: Toast.Style.Failure,
        title: "Missing Private Key",
      });
      return;
    }

    try {
      if (!(await hasValidCredentials(apiUrl, privateKey))) {
        throw new Error("Invalid Playground API URL or Private Key");
      }

      await addToStore(API_URL, apiUrl);
      await addToStore(PRIVATE_KEY, privateKey);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: (error as Error).message as string,
      });
      return;
    }

    push(<MainMenu />);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Forward} title="Interact" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="apiUrl" title="Playground API URL" placeholder="http://localhost:42069" storeValue />
      <Form.TextField id="privateKey" title="Your Private Key" placeholder="0x123abc..." storeValue />
    </Form>
  );
}
