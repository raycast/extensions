import { Action, ActionPanel, Form, popToRoot, showToast, Toast, useNavigation } from "@raycast/api";
import { validateLayout, getLayoutValidationMessage } from "./utils";
import { saveCustomLayout } from "./utils/custom-layouts";

type CreateCustomLayoutProps = {
  onCreate?: () => void;
};

export function CreateCustomLayout({ onCreate }: CreateCustomLayoutProps) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { name: string; grid: string }) {
    const name = values.name.trim();
    if (!name) {
      await showToast({ style: Toast.Style.Failure, title: "Please enter a name" });
      return;
    }

    let grid: number[][];
    try {
      grid = JSON.parse(values.grid);
      if (!Array.isArray(grid) || !grid.every((row) => Array.isArray(row))) {
        throw new Error("Must be a 2D array");
      }
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid JSON",
        message: "Enter a valid 2D array, e.g. [[1,1,2],[3,4,2]]",
      });
      return;
    }

    const validation = validateLayout(grid);
    if (!validation.isValid) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid layout",
        message: getLayoutValidationMessage(validation.errors),
      });
      return;
    }

    const saved = await saveCustomLayout({
      name,
      grid,
      createdAt: new Date().toISOString(),
    });

    if (!saved) return;

    await showToast({
      style: Toast.Style.Success,
      title: `Layout "${name}" created`,
    });

    if (onCreate) {
      pop();
      onCreate();
    } else {
      await popToRoot();
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Layout" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Layout Name" placeholder="My Custom Layout" />
      <Form.TextArea
        id="grid"
        title="Grid (JSON)"
        placeholder="[[1,1,2],[3,4,2]]"
        info={
          "Define a 2D grid where each number represents a window.\n" +
          "Repeated numbers make a window span multiple cells.\n\n" +
          "Examples:\n" +
          "  [[1,2]]           → Two columns 50/50\n" +
          "  [[1,1,2],[3,4,2]] → 4 windows, #1 spans 2 cols, #2 spans 2 rows\n" +
          "  [[1,2],[1,3]]     → #1 tall left, #2 and #3 stacked right"
        }
      />
    </Form>
  );
}

// Default export for standalone command usage
export default function Command() {
  return <CreateCustomLayout />;
}
