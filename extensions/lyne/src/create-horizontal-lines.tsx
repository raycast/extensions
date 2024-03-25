import open from "open";
import { showHUD, closeMainWindow, getApplications, Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";

export default function Command() {
  async function createHorizontalLines(positions: string | null | undefined, layout: string | null | undefined) {
    if (await isAppInstalled()) {
      if (positions) {
        const numbers = positions.split(",").map((position) => parseInt(position.trim()));
        createHorizontalLinesLyne(numbers, layout);
      } else {
        const options: Toast.Options = {
          style: Toast.Style.Failure,
          title: "Line Positions are not valid",
          message: "Example : 100, 200, 300",
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

  async function isAppInstalled() {
    const applications = await getApplications();
    return applications.some(({ bundleId }) => (bundleId ? ["net.lyneapp.lyne"].includes(bundleId) : false));
  }

  async function createHorizontalLinesLyne(positions: number[], layout: string | null | undefined) {
    let url = "lyne://create-horizontal?lines=" + positions.join(",");
    if (layout && layout.trim() !== "") {
      url += "&layout=" + layout;
    }
    open(url);
    await closeMainWindow();
    await showHUD("Horizontal Lines Created ✨");
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={(values) =>
              createHorizontalLines(values.horizontal_line_positions, values.horizontal_line_layout)
            }
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Create Horizontal Lines"
        text="It takes a list of positions (numbers separated by comma) and an optional layout name and creates multiple horizontal lines."
      />
      <Form.TextField
        id="horizontal_line_positions"
        title="Line Positions"
        placeholder="Enter a list of numbers separated by comma"
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
