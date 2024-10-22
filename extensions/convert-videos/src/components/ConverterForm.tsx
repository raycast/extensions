import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { convertVideo } from "../utils/converter";

export function ConverterForm() {
  const handleSubmit = async (values: { movFile: string[]; format: string }) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Converting file...",
    });

    try {
      const outputPath = await convertVideo(values.movFile[0], values.format as "mp4" | "avi" | "mkv");
      await toast.hide();
      await showToast({
        style: Toast.Style.Success,
        title: "File converted successfully!",
        message: `Saved as: ${outputPath}`,
      });
    } catch (error) {
      await toast.hide();
      await showToast({
        style: Toast.Style.Failure,
        title: "Conversion failed",
        message: String(error),
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Convert" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="movFile" title="Select a video file" allowMultipleSelection={false} />
      <Form.Dropdown id="format" title="Select output format" defaultValue="mp4">
        <Form.Dropdown.Item value="mp4" title=".mp4" />
        <Form.Dropdown.Item value="avi" title=".avi" />
        <Form.Dropdown.Item value="mkv" title=".mkv" />
        <Form.Dropdown.Item value="mov" title=".mov" />
      </Form.Dropdown>
    </Form>
  );
}
