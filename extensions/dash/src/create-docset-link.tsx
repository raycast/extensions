import { DashArguments } from "./types";
import { Action, ActionPanel, Detail, List, showToast, Toast } from "@raycast/api";
import { createDeeplinkForDocset } from "./utils";

export default function Command(props: { arguments: DashArguments }) {
  const { docset = "" } = props.arguments;
  if (!docset) {
    showToast({
      style: Toast.Style.Failure,
      title: "Docset keyword is required",
    });
    return <Detail markdown={`Can not create Quicklink, docset keyword is required!`}></Detail>;
  }
  const deeplink = createDeeplinkForDocset(docset);
  return (
    <List searchBarPlaceholder="Just Press Enter to Create" filtering={false}>
      <List.Item
        title={`Create Quicklink for Docset [${docset}]`}
        actions={
          <ActionPanel>
            <Action.CreateQuicklink
              title="Create Quicklink"
              quicklink={{
                link: deeplink,
              }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
