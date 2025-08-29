import { Detail, ActionPanel, Action, useNavigation } from "@raycast/api";
import { GITHUB_REPO_URL } from "../constants";

export default function SettingsView() {
  const { pop } = useNavigation();

  return (
    <Detail
      markdown={`**Welcome to Brreg Search**\n\n- 🔍 Search for companies\n- ⭐ Favorite (⌘F) or remove (⌘⇧F) companies\n- 📑 See details (⌘↵) and cycle tabs (⌘1/2/3)\n\nHave feature requests or improvements? [Open an issue on GitHub](${GITHUB_REPO_URL}).`}
      actions={
        <ActionPanel>
          <Action title="Back" onAction={pop} />
        </ActionPanel>
      }
    />
  );
}
