import { Action, ActionPanel, closeMainWindow, Form, showToast, Toast } from "@raycast/api";
import { COMMANDS } from "./consts";
import { controlYouTubeMusic } from "./utils";

export default function RepeatCommand(): JSX.Element {
  async function handleSubmit(values: { time: number }) {
    try {
      await controlYouTubeMusic(COMMANDS.SEEK_TO, values.time);
      await showToast({
        style: Toast.Style.Success,
        title: "Seek To",
        message: `Seconds: ${values.time}`,
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
      <Form.TextField id="time" title="Time" placeholder="Enter time in seconds" />
    </Form>
  );
}
