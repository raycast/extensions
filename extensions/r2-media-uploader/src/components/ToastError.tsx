import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  closeMainWindow,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useEffect } from "react";

export function ToastError(props: {
  title: string;
  message?: string;
  openPreferences?: boolean;
  /**
   * If true, close Raycast main window after showing the toast.
   * Defaults to false so users can read the error.
   */
  closeWindow?: boolean;
}) {
  useEffect(() => {
    void (async () => {
      await showToast({
        style: Toast.Style.Failure,
        title: props.title,
        message: props.message,
        primaryAction: props.openPreferences
          ? {
              title: "Open Extension Preferences",
              onAction: () => openExtensionPreferences(),
            }
          : undefined,
      });

      if (props.closeWindow === true) {
        await closeMainWindow({ clearRootSearch: true });
      }
    })();
  }, [props.closeWindow, props.message, props.openPreferences, props.title]);

  return (
    <Form
      navigationTitle={props.title}
      actions={
        <ActionPanel>
          {props.openPreferences ? (
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          ) : null}
          <Action title="Close" icon={Icon.XmarkCircle} onAction={() => closeMainWindow({ clearRootSearch: true })} />
        </ActionPanel>
      }
    >
      <Form.Description title="Error" text={props.message ? `${props.title}\n\n${props.message}` : props.title} />
    </Form>
  );
}
