import open from "open";
import { showHUD, closeMainWindow, getApplications, Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";

export default function Command() {

  async function createHorizontalLine(position: number, layout: string | null | undefined) {
    if (await isAppInstalled()) {
      if (isNumber(position) === true) {
        createHorizontalLineLyne(position, layout)
      } else {
        const options: Toast.Options = {
          style: Toast.Style.Failure,
          title: "Line Position is not valid",
          message: "Example : 100",
          primaryAction: {
            title: "Please try again",
            onAction: (toast) => {
              toast.hide();
            },
          },
        };
        await showToast(options);
      }
    } else {
      const options: Toast.Options = {
        style: Toast.Style.Failure,
        title: "Lyne is not installed",
        message: "More ...",
        primaryAction: {
          title: "Get it on App Store",
          onAction: (toast) => {
            open("https://apps.apple.com/us/app/lyne-precision-simplified/id6478086157");
            toast.hide();
          },
        },
      };
      await showToast(options);
    }
  }

  function isNumber(arg: any): boolean {
    return typeof arg === 'number' || (!isNaN(Number(arg)) && arg !== '');
  }

  async function isAppInstalled() {
    const applications = await getApplications();
    return applications.some(({ bundleId }) => bundleId ? ["net.lyneapp.lyne"].includes(bundleId) : false);
  }

  async function createHorizontalLineLyne(position: number, layout: string | null | undefined) {
    let url = "lyne://create-horizontal?line=" + position
    if (layout && layout.trim() !== '') {
      url += ("&layout=" + layout);
    }
    open(url);
    await closeMainWindow();
    await showHUD("Horizontal Line Created ✨");
  }

  return (
    <Form actions={<ActionPanel><Action.SubmitForm onSubmit={(values) => createHorizontalLine(values.horizontal_line_position, values.horizontal_line_layout)} /></ActionPanel>}>
      <Form.Description
        title="Create Horizontal Line"
        text="It takes a position (number) and an optional layout name and creates a horizontal line."
      />
      <Form.TextField
        id="horizontal_line_position"
        title="Line Position"
        placeholder="Enter a number"
        info="Must be an Integer"
      />
      <Form.TextField
        id="horizontal_line_layout"
        title="Line Layout"
        placeholder="Enter text (optional)"
        info="This is optional"
      />
    </Form>
  );
}
