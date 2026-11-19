import { Action, ActionPanel, Clipboard, Icon, LaunchProps, List, showToast, Toast, Keyboard } from "@raycast/api";
import { useEffect, useState } from "react";
import { errorMessage } from "./lib/errors";
import { generateUuid, parseUuidVersion, UuidVersion } from "./lib/uuid";

function initialVersion(input?: string): { version: UuidVersion; error?: string } {
  try {
    return { version: parseUuidVersion(input) };
  } catch (error) {
    return { version: 4, error: errorMessage(error) };
  }
}

export default function Command(props: LaunchProps<{ arguments: Arguments.Uuid }>) {
  const [initial] = useState(() => initialVersion(props.arguments.version));
  const [uuid, setUuid] = useState(() => ({ version: initial.version, value: generateUuid(initial.version) }));

  useEffect(() => {
    Clipboard.copy(uuid.value).then(() =>
      showToast(
        initial.error && uuid.version === initial.version
          ? { style: Toast.Style.Failure, title: initial.error, message: `Copied a UUID v${uuid.version} instead` }
          : { style: Toast.Style.Success, title: `Copied UUID v${uuid.version}`, message: uuid.value },
      ),
    );
  }, [uuid]);

  const regenerate = (version: UuidVersion) => setUuid({ version, value: generateUuid(version) });
  const other: UuidVersion = uuid.version === 4 ? 7 : 4;

  const variants = [
    { title: uuid.value.toUpperCase(), label: "Uppercase" },
    { title: uuid.value.replace(/-/g, ""), label: "No Dashes" },
    { title: `urn:uuid:${uuid.value}`, label: "URN" },
    { title: `{${uuid.value}}`, label: "Braces" },
  ];
  if (uuid.version === 7) {
    const ms = parseInt(uuid.value.replace(/-/g, "").slice(0, 12), 16);
    variants.push({ title: new Date(ms).toISOString(), label: "Embedded Timestamp" });
  }

  const actions = (content: string) => (
    <ActionPanel>
      <Action.CopyToClipboard content={content} />
      <Action.Paste content={content} />
      <Action
        title="Regenerate"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={() => regenerate(uuid.version)}
      />
      <Action
        title={`Generate UUID V${other}`}
        icon={Icon.Switch}
        shortcut={{ modifiers: ["cmd"], key: "t" }}
        onAction={() => regenerate(other)}
      />
    </ActionPanel>
  );

  return (
    <List searchBarPlaceholder="Filter formats">
      <List.Section title={`UUID v${uuid.version}`} subtitle="Copied to clipboard">
        <List.Item
          icon={Icon.Fingerprint}
          title={uuid.value}
          accessories={[{ tag: `v${uuid.version}` }, { icon: Icon.CopyClipboard, tooltip: "Copied" }]}
          actions={actions(uuid.value)}
        />
      </List.Section>
      <List.Section title="Formats">
        {variants.map((v) => (
          <List.Item key={v.label} title={v.title} accessories={[{ text: v.label }]} actions={actions(v.title)} />
        ))}
      </List.Section>
    </List>
  );
}
