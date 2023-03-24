import { Action, ActionPanel, Icon, LocalStorage } from "@raycast/api";
import { LOCAL_STORAGE_KEY } from "~/constants/general";
import { getTransientCopyPreference } from "~/utils/preferences";

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
            title="Copy Password"
            icon={Icon.Clipboard}
            content={password}
            shortcut={{ key: "enter", modifiers: ["cmd"] }}
            transient={getTransientCopyPreference("password")}
          />
          <Action.Paste
            title="Paste Password to Active App"
            icon={Icon.Text}
            content={password}
            shortcut={{ key: "enter", modifiers: ["cmd", "shift"] }}
          />
        </>
      )}
      <Action
        title="Regenerate Password"
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
