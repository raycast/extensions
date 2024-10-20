import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { convertMovToMp4 } from "../utils/converter";

export function ConverterForm() {
  const handleSubmit = async (values: { movFile: string[] }) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Converting file...",
    });

    try {
      const outputPath = await convertMovToMp4(values.movFile[0]);
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
      <Form.FilePicker id="movFile" title="Select a .mov file" allowMultipleSelection={false} />
    </Form>
  );
}
