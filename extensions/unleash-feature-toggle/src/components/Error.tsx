import { Action, ActionPanel, Detail, openCommandPreferences } from "@raycast/api";
import { generateErrorMessage } from "../helpers";

export default function Error({ errCode, revalidate }: { errCode: number; revalidate?: () => void }) {
  const actions = (() => {
    switch (errCode) {
      case 401:
        return (
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openCommandPreferences} />
          </ActionPanel>
        );
      case 403:
        return null;
      default:
        return (
          <ActionPanel>
            <Action title="Reload" onAction={() => revalidate?.()} />
          </ActionPanel>
        );
    }
  })();

  return <Detail markdown={`### ${generateErrorMessage(errCode)}`} actions={actions} />;
}
