import { Icon, Action, ActionPanel, Clipboard, Detail, useNavigation, popToRoot, closeMainWindow } from "@raycast/api";
import useTsCode from "./hooks/useTsCode";
import LibSelectForm from "./lib-select-form";

export default function main() {
  const [{ code, markdown, loading }] = useTsCode();
  const nav = useNavigation();
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
            title="Change convert library. "
            onAction={() => nav.push(<LibSelectForm />)}
          />
        </ActionPanel>
      }
    />
  );
}
