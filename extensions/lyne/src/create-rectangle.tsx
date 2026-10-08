import open from "open";
import { showHUD, closeMainWindow, getApplications, Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";

export default function Command() {
  async function createRectangle(
    hPositions: string | null | undefined,
    vPositions: string | null | undefined,
    layout: string | null | undefined,
  ) {
    if (await isAppInstalled()) {
      if (!hPositions) {
        const options: Toast.Options = {
          style: Toast.Style.Failure,
          title: "Horizontal Line Positions are not valid",
          message: "Example : 100, 200, 300",
          primaryAction: {
            title: "Please try again",
            onAction: (toast) => {
              toast.hide();
            },
          },
        };
        await showToast(options);
      } else if (!vPositions) {
        const options: Toast.Options = {
          style: Toast.Style.Failure,
          title: "Vertical Line Positions are not valid",
          message: "Example : 100, 200, 300",
          primaryAction: {
            title: "Please try again",
            onAction: (toast) => {
              toast.hide();
            },
          },
        };
        await showToast(options);
      } else {
        const hNumbers = hPositions.split(",").map((position) => parseInt(position.trim()));
        const vNumbers = vPositions.split(",").map((position) => parseInt(position.trim()));
        createRectangleLyne(hNumbers, vNumbers, layout);
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

  async function createRectangleLyne(hPositions: number[], vPositions: number[], layout: string | null | undefined) {
    let url = "lyne://create-rectangle?hlines=" + hPositions.join(",") + "&vlines=" + vPositions.join(",");
    if (layout && layout.trim() !== "") {
      url += "&layout=" + layout;
    }
    open(url);
    await closeMainWindow();
    await showHUD("Rectangle Created ✨");
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={(values) =>
              createRectangle(values.horizontal_line_positions, values.vertical_line_positions, values.rectangle_layout)
            }
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Create Vertical Lines"
        text="It takes a list of horizontal and vertical positions (numbers separated by comma) and an optional layout name and creates a rectangle."
      />
      <Form.TextField
        id="horizontal_line_positions"
        title="Horizontal Line Positions"
        placeholder="Enter a list of numbers separated by comma"
        info="Must be an Integer"
      />
      <Form.TextField
        id="vertical_line_positions"
        title="Vertical Line Positions"
        placeholder="Enter a list of numbers separated by comma"
        info="Must be an Integer"
      />
      <Form.TextField
        id="rectangle_layout"
        title="Rectangle Layout"
        placeholder="Enter text (optional)"
        info="This is optional"
      />
    </Form>
  );
}
