import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  Icon,
  Keyboard,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { COLOURS } from "./data/colours";
import { buildEmbedCode, EmbedInput } from "./lib/embed";

function CodePreview({ code }: { code: string }) {
  return (
    <Detail
      navigationTitle="Embed Code"
      markdown={`\`\`\`java\n${code}\n\`\`\``}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Java Code" content={code} />
        </ActionPanel>
      }
    />
  );
}

export default function EmbedBuilder() {
  const { push } = useNavigation();

  async function copy(values: EmbedInput) {
    await Clipboard.copy(buildEmbedCode(values));
    await showToast({ style: Toast.Style.Success, title: "Copied embed code" });
  }

  return (
    <Form
      navigationTitle="Embed Builder"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Copy Java Code"
            icon={Icon.Clipboard}
            onSubmit={copy}
          />
          <Action.SubmitForm
            title="Show Code"
            icon={Icon.Eye}
            shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
            onSubmit={(values: EmbedInput) =>
              push(<CodePreview code={buildEmbedCode(values)} />)
            }
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Embed title" />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Embed description"
      />
      <Form.TextField
        id="url"
        title="Title URL"
        placeholder="https://example.com"
      />
      <Form.Dropdown id="colour" title="Colour" defaultValue="0x5865F2">
        <Form.Dropdown.Item value="" title="None" />
        {COLOURS.map((colour) => (
          <Form.Dropdown.Item
            key={colour.name}
            value={colour.hex.replace("#", "0x")}
            title={`${colour.title} — ${colour.hex}`}
          />
        ))}
      </Form.Dropdown>
      <Form.Checkbox
        id="timestamp"
        title="Timestamp"
        label="Set the timestamp to Instant.now()"
      />

      <Form.Separator />
      <Form.TextArea
        id="fields"
        title="Fields"
        placeholder={
          "One field per line: name | value | inline\nPing | Pong | true"
        }
        info="Each line becomes an addField call. The third column is optional and defaults to inline true."
      />

      <Form.Separator />
      <Form.TextField id="authorName" title="Author Name" />
      <Form.TextField id="authorUrl" title="Author URL" />
      <Form.TextField id="authorIcon" title="Author Icon URL" />
      <Form.TextField id="thumbnail" title="Thumbnail URL" />
      <Form.TextField id="image" title="Image URL" />
      <Form.TextField id="footerText" title="Footer Text" />
      <Form.TextField id="footerIcon" title="Footer Icon URL" />
    </Form>
  );
}
