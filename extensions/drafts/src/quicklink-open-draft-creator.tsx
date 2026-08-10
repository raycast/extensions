import { Action, ActionPanel, Detail, LaunchProps } from "@raycast/api";
import { checkAppInstallation } from "./utils/ApplicationInstalledCheck";

export default function Command(props: LaunchProps<{ arguments: Arguments.QuicklinkOpenDraftCreator }>) {
  // app installation check (shows Toast if Drafts is not installed)
  checkAppInstallation();
  const { title, uuid } = props.arguments;
  const quickLinkTitle = "Open Draft: " + title;
  const url = "drafts://open?uuid=" + uuid;

  const detailText = `# Create Quicklink "${quickLinkTitle}"

  This helper command creates a Raycast Quicklink to open the Draft "${title}" by using Drafts URL scheme and the UUID of the Draft you provided.

  Proceed with ↵ (Enter) to create the Quicklink`;

  return (
    <Detail
      markdown={detailText}
      actions={
        <ActionPanel>
          <Action.CreateQuicklink quicklink={{ link: url, name: quickLinkTitle }} />
        </ActionPanel>
      }
    />
  );
}
