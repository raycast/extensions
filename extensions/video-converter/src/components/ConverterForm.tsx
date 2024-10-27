import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { convertVideo } from "../utils/converter";
import path from "path";

const ALLOWED_EXTENSIONS = [".mov", ".mp4", ".avi", ".mkv"];

export function ConverterForm() {
  const handleSubmit = async (values: { videoFile: string[]; format: string }) => {
    const fileExtension = path.extname(values.videoFile[0]).toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid file type",
        message: "Please select a video file (.mov, .mp4, .avi, .mkv)",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Converting file...",
    });

    values.videoFile.forEach(async (item) => {
      try {
        const outputPath = await convertVideo(item, values.format as "mp4" | "avi" | "mkv" | "mov");
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
    })
    
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Convert" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="videoFile" title="Select a video file"/>
      <Form.Dropdown id="format" title="Select output format" defaultValue="mp4">
        <Form.Dropdown.Item value="mp4" title=".mp4" />
        <Form.Dropdown.Item value="avi" title=".avi" />
        <Form.Dropdown.Item value="mkv" title=".mkv" />
        <Form.Dropdown.Item value="mov" title=".mov" /> 
      </Form.Dropdown>
    </Form>
  );
}
