import { Action, ActionPanel, Clipboard, Form, showHUD, showToast, Toast, useNavigation } from "@raycast/api";
import { personalAccessToken } from "../preferences";
import { Codespace } from "../types";
import fetch from "node-fetch";

const Rename = ({ codespace, onRevalidate }: { codespace: Codespace; onRevalidate: () => void }) => {
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Rename"
            onSubmit={async ({ name }) => {
              const toast = await showToast({
                title: `Renaming to ${name}...`,
                style: Toast.Style.Animated,
              });
              try {
                const response = await fetch(`${codespace.url}`, {
                  method: "PATCH",
                  headers: {
                    Accept: "application/vnd.github+json",
                    Authorization: `Bearer ${personalAccessToken}`,
                  },
                  body: JSON.stringify({
                    display_name: name,
                  }),
                });
                if (response.status !== 200) {
                  const data = (await response.json()) as { message: string; documentation_url: string };
                  toast.style = Toast.Style.Failure;
                  toast.title = data.message;
                  toast.primaryAction = {
                    title: "Copy link to docs",
                    onAction: () => {
                      Clipboard.copy(data.documentation_url);
                    },
                  };
                } else {
                  await toast.hide();
                  await showHUD("Name successfully changed");
                  pop();
                  onRevalidate();
                }
              } catch (error) {
                console.log(error);
                toast.style = Toast.Style.Failure;
                toast.title = "Failed to change name";
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        defaultValue={codespace.display_name || ""}
        placeholder="Select a display name for this codespace"
      />
    </Form>
  );
};

export default Rename;
