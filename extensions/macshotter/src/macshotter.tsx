import { Action, ActionPanel, Form, Icon, List, showToast, Toast } from "@raycast/api";
import { openImage, trigger } from "./macshot";

interface MacShotterAction {
  title: string;
  subtitle: string;
  action: string;
  icon: Icon;
  keywords: string[];
  hud?: string;
}

const captureActions: MacShotterAction[] = [
  {
    title: "Capture Area",
    subtitle: "Select a screen area",
    action: "capture",
    icon: Icon.Crop,
    keywords: ["screenshot", "selection", "snip"],
  },
  {
    title: "Capture Fullscreen",
    subtitle: "Capture the entire screen",
    action: "capture-fullscreen",
    icon: Icon.Desktop,
    keywords: ["screenshot", "fullscreen"],
  },
  {
    title: "Quick Capture",
    subtitle: "Capture and auto copy/save",
    action: "quick-capture",
    icon: Icon.Camera,
    keywords: ["screenshot", "quick", "copy"],
    hud: "📸 Captured",
  },
  {
    title: "Scroll Capture",
    subtitle: "Capture a scrolling screenshot",
    action: "scroll-capture",
    icon: Icon.ArrowsExpand,
    keywords: ["screenshot", "scrolling", "long"],
  },
  {
    title: "OCR Text Extraction",
    subtitle: "Extract text from a selection",
    action: "ocr",
    icon: Icon.Text,
    keywords: ["text", "recognize", "copy", "ocr"],
  },
];

const recordingActions: MacShotterAction[] = [
  {
    title: "Record Area",
    subtitle: "Record a selected screen area",
    action: "record",
    icon: Icon.Video,
    keywords: ["recording", "video", "screen"],
  },
  {
    title: "Record Fullscreen",
    subtitle: "Record the entire screen",
    action: "record-fullscreen",
    icon: Icon.Monitor,
    keywords: ["recording", "video", "fullscreen"],
  },
  {
    title: "Stop Recording",
    subtitle: "Stop the active recording",
    action: "stop-recording",
    icon: Icon.Stop,
    keywords: ["recording", "stop"],
  },
];

const appActions: MacShotterAction[] = [
  {
    title: "Show History",
    subtitle: "Open the macshot history overlay",
    action: "history",
    icon: Icon.Clock,
    keywords: ["history", "recent"],
  },
  {
    title: "Open Settings",
    subtitle: "Open macshot preferences",
    action: "settings",
    icon: Icon.Gear,
    keywords: ["preferences", "settings", "config"],
  },
];

export default function Command() {
  return (
    <List navigationTitle="MacShotter" searchBarPlaceholder="Search MacShotter actions">
      <List.Section title="Capture">
        {captureActions.map((item) => (
          <MacShotterListItem key={item.action} item={item} />
        ))}
      </List.Section>

      <List.Section title="Recording">
        {recordingActions.map((item) => (
          <MacShotterListItem key={item.action} item={item} />
        ))}
      </List.Section>

      <List.Section title="App">
        {appActions.map((item) => (
          <MacShotterListItem key={item.action} item={item} />
        ))}
        <List.Item
          title="Open Image in Editor"
          subtitle="Choose an image file"
          icon={Icon.Image}
          keywords={["editor", "open", "image"]}
          actions={
            <ActionPanel>
              <Action.Push title="Choose Image" icon={Icon.Finder} target={<OpenImageForm />} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function MacShotterListItem({ item }: { item: MacShotterAction }) {
  return (
    <List.Item
      title={item.title}
      subtitle={item.subtitle}
      icon={item.icon}
      keywords={item.keywords}
      actions={
        <ActionPanel>
          <Action title={item.title} icon={Icon.Play} onAction={() => trigger(item.action, item.hud)} />
        </ActionPanel>
      }
    />
  );
}

function OpenImageForm() {
  async function handleSubmit(values: { files: string[] }) {
    const file = values.files[0];

    if (!file) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Choose an image",
      });
      return;
    }

    await openImage(file);
  }

  return (
    <Form
      navigationTitle="Open Image in Editor"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Open in Editor" icon={Icon.Image} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="files"
        title="Image"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles
      />
    </Form>
  );
}
