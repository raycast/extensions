import {
  ActionPanel,
  ActionPanelItem,
  CopyToClipboardAction,
  Form,
  Icon,
  List,
  PasteAction,
  SubmitFormAction,
  Toast,
  ToastStyle,
  useNavigation,
} from "@raycast/api";
import tinycolor from "tinycolor2";

export default function Command() {
  const navigation = useNavigation();

  function handleSubmit(form: { color: string }) {
    const color = form.color;

    const toast = new Toast({ title: "", style: ToastStyle.Failure });
    toast.hide();

    if (!color) {
      toast.title = "Please enter a color";
      toast.show();
      return;
    }
    const parsedColor = tinycolor(color);
    if (!parsedColor.isValid()) {
      toast.title = "This is not a valid color";
      toast.show();
      return;
    }

    navigation.push(<ColorView parsedColor={parsedColor} />);
  }

  return (
    <Form
      navigationTitle="Insert color to convert"
      actions={
        <ActionPanel>
          <SubmitFormAction title="Convert" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="color" title="Color" placeholder="#FFCCDD" />
    </Form>
  );
}

const ColorView = ({ parsedColor: parsed }: { parsedColor: tinycolor.Instance }) => {
  const navigation = useNavigation();

  const c = parsed.toHexString();

  return (
    <List navigationTitle="Converted colors">
      <List.Section>
        <List.Item
          title="Convert new color"
          icon={Icon.ArrowClockwise}
          actions={
            <ActionPanel>
              <ActionPanelItem title="New color" onAction={() => navigation.pop()} />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Converted colors">
        <ColorItem description="HEX" color={c} value={parsed.toHexString()} />
        {parsed.getAlpha() < 1 && <ColorItem description="HEX8" color={c} value={parsed.toHex8String()} />}
        <ColorItem description="RGB" color={c} value={parsed.toRgbString()} />
        <ColorItem description="HSL" color={c} value={parsed.toHslString()} />
        <ColorItem description="HSV" color={c} value={parsed.toHsvString()} />
        <ColorItem
          description="Perceived brightness"
          color={c}
          value={Math.round((parsed.getBrightness() / 255) * 100).toString() + "%"}
        />
        {parsed.getAlpha() < 1 && <ColorItem description="Alpha" color={c} value={parsed.getAlpha().toString()} />}
        {parsed.toName() && <ColorItem description="Name" color={c} value={parsed.toName() || ""} />}
      </List.Section>
    </List>
  );
};

const ColorItem = ({ description, value, color }: { description: string; value: string; color: string | false }) => {
  if (color === false) return null;

  return (
    <List.Item
      icon={{ source: Icon.Circle, tintColor: color }}
      title={value}
      accessoryTitle={description}
      actions={<ColorActions content={value} />}
    />
  );
};

const ColorActions = ({ content }: { content: string }) => {
  return (
    <ActionPanel>
      <CopyToClipboardAction title="Copy to clipboard" content={content} />
      <PasteAction title="Insert" content={content} shortcut={{ modifiers: ["cmd"], key: "enter" }} />
    </ActionPanel>
  );
};
