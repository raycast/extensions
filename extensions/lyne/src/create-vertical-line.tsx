import open from "open";
import { showHUD, closeMainWindow, getApplications, Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";

export default function Command() {

  async function createVerticalLine(position: number, layout: string | null | undefined) {
    if (await isAppInstalled()) {
      if (isNumber(position) === true) {
        createVerticalLineLyne(position, layout)
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

  async function createVerticalLineLyne(position: number, layout: string | null | undefined) {
    let url = "lyne://create-vertical?line=" + position
    if (layout && layout.trim() !== '') {
      url += ("&layout=" + layout);
    }
    open(url);
    await closeMainWindow();
    await showHUD("Vertical Line Created ✨");
  }

  return (
    <Form actions={<ActionPanel><Action.SubmitForm onSubmit={(values) => createVerticalLine(values.vertical_line_position, values.vertical_line_layout)} /></ActionPanel>}>
      <Form.Description
        title="Create Vertical Line"
        text="It takes a position (number) and an optional layout name and creates a vertical line."
      />
      <Form.TextField
        id="vertical_line_position"
        title="Line Position"
        placeholder="Enter a number"
        info="Must be an Integer"
      />
      <Form.TextField
        id="vertical_line_layout"
        title="Line Layout"
        placeholder="Enter text (optional)"
        info="This is optional"
      />
    </Form>
  );
}
