import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  List,
  Toast,
  getPreferenceValues,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import {
  Direction,
  convert,
  detectDirection,
  directionLabel,
  reverse,
} from "./lib/layouts";

interface Prefs {
  defaultDirection: Direction | "auto";
  azerty: boolean;
  toast: boolean;
}

export default function ConvertCommand() {
  const prefs = getPreferenceValues<Prefs>();
  const [text, setText] = useState("");
  const [direction, setDirection] = useState<Direction>("en2ar");
  const [autoDetect, setAutoDetect] = useState(true);

  useEffect(() => {
    Clipboard.readText().then((clip) => {
      if (clip && clip.trim().length > 0 && clip.length < 5000) {
        setText(clip);
      }
    });
  }, []);

  useEffect(() => {
    if (autoDetect) setDirection(detectDirection(text, prefs.azerty));
  }, [text, autoDetect, prefs.azerty]);

  const converted = useMemo(
    () => (text ? convert(text, direction) : ""),
    [text, direction],
  );
  const isArabicOutput = direction === "en2ar";

  return (
    <List
      searchBarPlaceholder="Type or paste text to convert…"
      searchText={text}
      onSearchTextChange={setText}
      isShowingDetail
    >
      <List.Item
        title={converted || "—"}
        subtitle={directionLabel(direction)}
        icon={isArabicOutput ? Icon.Text : Icon.Keyboard}
        accessories={[{ tag: directionLabel(direction) }]}
        detail={
          <List.Item.Detail
            markdown={renderPreview(text, converted, isArabicOutput)}
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label
                  title="Direction"
                  text={directionLabel(direction)}
                />
                <List.Item.Detail.Metadata.Label
                  title="Auto-detect"
                  text={autoDetect ? "On" : "Off"}
                />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label
                  title="Characters in"
                  text={String(text.length)}
                />
                <List.Item.Detail.Metadata.Label
                  title="Characters out"
                  text={String(converted.length)}
                />
              </List.Item.Detail.Metadata>
            }
          />
        }
        actions={
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy Converted Text"
              content={converted}
              shortcut={{ modifiers: [], key: "return" }}
              onCopy={() => maybeToast(prefs.toast, direction)}
            />
            <Action.Paste
              title="Paste into Frontmost App"
              content={converted}
              shortcut={{ modifiers: ["cmd"], key: "return" }}
              onPaste={() => maybeToast(prefs.toast, direction)}
            />
            <Action
              title="Reverse Direction"
              icon={Icon.Repeat}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => {
                setAutoDetect(false);
                setDirection((d) => reverse(d));
              }}
            />
            <DirectionPickerAction
              azerty={prefs.azerty}
              onPick={(d) => {
                setAutoDetect(false);
                setDirection(d);
              }}
            />
            <Action
              title={autoDetect ? "Disable Auto-detect" : "Enable Auto-detect"}
              icon={Icon.Wand}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              onAction={() => setAutoDetect((v) => !v)}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

function renderPreview(
  input: string,
  output: string,
  isArabic: boolean,
): string {
  if (!input) return "_Start typing or paste mis-typed text above._";
  const outBlock = isArabic
    ? `<div dir="rtl" lang="ar">\n\n${output}\n\n</div>`
    : `\n${output}\n`;
  return `**Input**\n\n\`\`\`\n${input}\n\`\`\`\n\n**Output**\n${outBlock}`;
}

function DirectionPickerAction({
  azerty,
  onPick,
}: {
  azerty: boolean;
  onPick: (d: Direction) => void;
}) {
  const { push } = useNavigation();
  return (
    <Action
      title="Pick Direction…"
      icon={Icon.ArrowsExpand}
      shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
      onAction={() => push(<DirectionPicker azerty={azerty} onPick={onPick} />)}
    />
  );
}

function DirectionPicker({
  azerty,
  onPick,
}: {
  azerty: boolean;
  onPick: (d: Direction) => void;
}) {
  const { pop } = useNavigation();
  const options: Direction[] = azerty
    ? ["en2ar", "ar2en", "en2fr", "fr2en"]
    : ["en2ar", "ar2en"];
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Use Direction" onSubmit={() => pop()} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="direction"
        title="Direction"
        onChange={(value) => {
          onPick(value as Direction);
          pop();
        }}
      >
        {options.map((d) => (
          <Form.Dropdown.Item key={d} value={d} title={directionLabel(d)} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

async function maybeToast(enabled: boolean, d: Direction) {
  if (!enabled) return;
  await showToast({
    style: Toast.Style.Success,
    title: `Converted ${directionLabel(d)}`,
  });
}
