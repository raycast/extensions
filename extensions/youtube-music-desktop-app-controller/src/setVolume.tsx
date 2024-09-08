import { Action, ActionPanel, closeMainWindow, Form, showToast, Toast } from "@raycast/api";
import { COMMANDS } from "./consts";
import { controlYouTubeMusic } from "./utils";

export default function RepeatCommand(): JSX.Element {
  async function handleSubmit(values: { volume: number }) {
    try {
      await controlYouTubeMusic(COMMANDS.SET_VOLUME, values.volume);
      await showToast({
        style: Toast.Style.Success,
        title: "Volume",
        message: `Volume: ${values.volume}`,
      });
      await closeMainWindow();
    } catch (error) {
      console.error(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "An unknown error occurred",
      });
    } finally {
      await closeMainWindow();
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Seek To" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="volume" title="Time" placeholder="Enter volume in percentage" />
    </Form>
  );
}
