import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { getEnumKeysExcludingCurrent } from "../../util";

export class AwsAction {
  public static Console = ({ url, onAction }: { url: string; onAction?: () => void }) => (
    <ActionPanel.Section title="Console">
      <Action.OpenInBrowser key="openConsoleLink" title="Open in Browser" url={url} onOpen={() => onAction?.()} />
      <Action.CopyToClipboard
        key="copyConsoleLink"
        title="Copy Link"
        content={url}
        shortcut={Keyboard.Shortcut.Common.Copy}
        onCopy={() => onAction?.()}
      />
    </ActionPanel.Section>
  );

  public static ExportResponse = ({ response }: { response: unknown }) => (
    <Action.CopyToClipboard
      title="Copy Service Response"
      content={JSON.stringify(response, null, 2)}
      shortcut={{ modifiers: ["opt"], key: "e" }}
    />
  );

  public static SwitchResourceType<T extends object>({
    setResourceType,
    current,
    enumType,
  }: {
    setResourceType: (resourceType: T[keyof T]) => void;
    current: T[keyof T];
    enumType: T;
  }) {
    const allKeysExceptCurrent = getEnumKeysExcludingCurrent(enumType, current);
    return (
      <ActionPanel.Section>
        <ActionPanel.Submenu
          title="Switch Resource Type"
          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          filtering
          icon={Icon.Box}
        >
          {allKeysExceptCurrent.map((k) => (
            <Action
              title={`Show ${k.toString()}`}
              onAction={() => setResourceType(enumType[k])}
              key={k.toString()}
              icon={Icon.Box}
            />
          ))}
        </ActionPanel.Submenu>
      </ActionPanel.Section>
    );
  }
}
