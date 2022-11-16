import {
  Icon,
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  popToRoot,
  closeMainWindow,
  openCommandPreferences,
} from "@raycast/api";
import useTsCode from "./hooks/useTsCode";

export default function main() {
  const [{ code, markdown, loading }] = useTsCode();
  return (
    <Detail
      isLoading={loading}
      markdown={markdown}
      actions={
        <ActionPanel>
          {code && (
            <Action
              icon={Icon.CopyClipboard}
              title="Copy"
              onAction={() => {
                Clipboard.copy(code);
                popToRoot({ clearSearchBar: true });
                closeMainWindow();
              }}
            />
          )}
          <Action
            icon={Icon.Gear}
            shortcut={{
              modifiers: ["cmd"],
              key: "t",
            }}
            title="Change convert library. (CMD + T)"
            onAction={() => openCommandPreferences()}
          />
        </ActionPanel>
      }
    />
  );
}
