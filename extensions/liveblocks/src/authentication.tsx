import { Form, ActionPanel, Action, showToast, Toast, LocalStorage, popToRoot } from "@raycast/api";
import axios, { AxiosError } from "axios";

interface CommandForm {
  secret: string;
}

export default function Command() {
  async function handleSubmit(values: CommandForm) {
    try {
      const { data } = await axios.get("https://liveblocks.io/api/authorize", {
        headers: { Authorization: `Bearer ${values.secret}` },
      });

      await LocalStorage.setItem("liveblocks-jwt", data.token);

      showToast({ title: "Authorization successful" });
    } catch (e) {
      const error = e as AxiosError;
      const status = error.response?.status;

      if (status === 404) {
        showToast({
          style: Toast.Style.Failure,
          title: "Invalid secret key",
        });
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: `${status} error when performing authorization`,
        });
      }
    }

    popToRoot();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Authenticate" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="secret" title="Secret" placeholder="Enter secret" />
    </Form>
  );
}
