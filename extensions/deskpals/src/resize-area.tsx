import { ActionPanel, Action, Form, open, closeMainWindow, showToast, Toast } from "@raycast/api";

interface Values {
  width: string;
  height: string;
}

export default function Command() {
  async function handleSubmit(values: Values) {
    const width = Number(values.width);
    const height = Number(values.height);

    if (isNaN(width) || isNaN(height) || width < 200 || width > 2000 || height < 200 || height > 2000) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid dimensions",
        message: "Width and height must be between 200 and 2000",
      });
      return;
    }

    const url = `deskpals://resize?width=${width}&height=${height}`;
    await closeMainWindow();
    await open(url);
    await showToast({ style: Toast.Style.Success, title: `Resized to ${width} x ${height}` });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Resize Area" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="width" title="Width" placeholder="200–2000" defaultValue="400" />
      <Form.TextField id="height" title="Height" placeholder="200–2000" defaultValue="300" />
      <Form.Description text="Set the overlay area dimensions in pixels (200–2000)." />
    </Form>
  );
}
