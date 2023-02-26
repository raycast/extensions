import { Action, ActionPanel, Icon, LocalStorage } from "@raycast/api";
import { LOCAL_STORAGE_KEY } from "~/constants/general";

export type GeneratePasswordActionPanelProps = {
  password: string | undefined;
  regeneratePassword: () => void;
};

const GeneratePasswordActionPanel = (props: GeneratePasswordActionPanelProps) => {
  const { password, regeneratePassword } = props;

  return (
    <ActionPanel>
      {!!password && (
        <>
          <Action.CopyToClipboard
            title="Copy password"
            icon={Icon.Clipboard}
            content={password}
            shortcut={{ key: "enter", modifiers: ["cmd"] }}
          />
          <Action.Paste
            title="Paste password to active app"
            icon={Icon.Text}
            content={password}
            shortcut={{ key: "enter", modifiers: ["cmd", "shift"] }}
          />
        </>
      )}
      <Action
        title="Regenerate password"
        icon={Icon.ArrowClockwise}
        onAction={regeneratePassword}
        shortcut={{ key: "backspace", modifiers: ["cmd"] }}
      />
      {process.env.NODE_ENV === "development" && (
        <Action title="Clear storage" icon={Icon.Trash} onAction={clearStorage} />
      )}
    </ActionPanel>
  );
};

async function clearStorage() {
  for (const key of Object.values(LOCAL_STORAGE_KEY)) {
    await LocalStorage.removeItem(key);
  }
}

export default GeneratePasswordActionPanel;
