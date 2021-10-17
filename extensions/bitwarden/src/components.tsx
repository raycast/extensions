import { showToast, ToastStyle, setLocalStorageItem, Form, ActionPanel, SubmitFormAction } from "@raycast/api";
import execa from "execa";

export function UnlockForm(props: { setSessionToken: (session: string) => void }) {
    async function onSubmit(values: { password: string }) {
      try {
        const toast = await showToast(ToastStyle.Animated, "Loading Items...");
        const { stdout: sessionToken } = await execa("bw", ["unlock", values.password, "--raw"]);

        toast.hide();
        props.setSessionToken(sessionToken);
        setLocalStorageItem("sessionToken", sessionToken);
      } catch (error) {
        console.log(error);
        showToast(ToastStyle.Failure, "Wrong Password");
      }
    }
    return (
      <Form
        actions={
          <ActionPanel>
            <SubmitFormAction title="Unlock" onSubmit={onSubmit} />
          </ActionPanel>
        }
      >
        <Form.TextField id="password" title="Master password" />
      </Form>
    );
  }
