import { Action, ActionPanel, Form, popToRoot, showToast, Toast } from "@raycast/api";
import { getDesktopContext } from "./utils";
import { saveLayout, type SavedWindow } from "./utils/saved-layouts";

export default function Command() {
  async function handleSubmit(values: { name: string }) {
    const name = values.name.trim();
    if (!name) {
      await showToast({ style: Toast.Style.Failure, title: "Please enter a name" });
      return;
    }

    const context = await getDesktopContext();
    if (!context) return;

    const windows: SavedWindow[] = context.windows
      .filter((w) => typeof w.bounds === "object" && w.bounds !== null && "position" in w.bounds)
      .map((w) => {
        const bounds = w.bounds as { position: { x: number; y: number }; size: { width: number; height: number } };
        return {
          appName: w.application?.name ?? "Unknown",
          bounds: {
            x: bounds.position.x,
            y: bounds.position.y,
            width: bounds.size.width,
            height: bounds.size.height,
          },
        };
      });

    const saved = await saveLayout({
      name,
      windows,
      savedAt: new Date().toISOString(),
    });

    if (!saved) return;

    await showToast({
      style: Toast.Style.Success,
      title: `Layout "${name}" saved`,
      message: `${windows.length} window(s)`,
    });
    await popToRoot();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Current Layout" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Layout Name" placeholder="My workspace" />
    </Form>
  );
}
