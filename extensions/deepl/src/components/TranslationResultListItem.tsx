import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { TranslationState } from "../lib/deeplapi";
import TranslationResultDetail from "./TranslationResultDetail";

export default function TranslationResultListItem({ state }: { state: TranslationState }) {
  if (state.translation == null) {
    return null;
  }

  const { push } = useNavigation();

  return (
    <List.Item
      title={state.translation.text}
      actions={
        <ActionPanel>
          <Action
            title="View Translation"
            icon={{ source: Icon.AppWindowSidebarRight }}
            onAction={() => push(<TranslationResultDetail state={state} />)}
          />
          <Action.CopyToClipboard title="Copy Translated Text" content={state.translation?.text} />
        </ActionPanel>
      }
    />
  );
}
