import { Action, ActionPanel, closeMainWindow, Detail, Icon, PopToRootType, showToast, Toast } from "@raycast/api";
import { ReactElement } from "react";
import { DEFAULT_ERROR_TITLE, UnknownErrorText } from "../constants";
import { openFirefoxAtMozeidonPage } from "../actions";

export function UnknownError(): ReactElement {
  showToast(Toast.Style.Failure, DEFAULT_ERROR_TITLE);

  return (
    <Detail
      markdown={UnknownErrorText}
      actions={
        <ActionPanel title="Error">
          <OpenFirefoxAtMozeidonPage />
        </ActionPanel>
      }
    />
  );
}

function OpenFirefoxAtMozeidonPage() {
  async function handleAction() {
    openFirefoxAtMozeidonPage();
    await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
  }
  return <Action title="Open Mozeidon Docs" icon={{ source: Icon.Eye }} onAction={handleAction} />;
}
