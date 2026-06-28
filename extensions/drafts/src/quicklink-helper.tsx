import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { checkAppInstallation } from "./utils/ApplicationInstalledCheck";
import { QuicklinkDefinitions } from "./utils/Defines";

const detailText = `# Drafts Quicklink Helper

This is a helper action to easily create Raycast Quicklinks for Drafts.
To add a Quicklink simply run one of the included actions (press \`⌘ + K\` to expand the menu). 

In the displayed menu you can give the new Quicklink a name of your choice and press \`⌘ + ↵\`.

You can add Quicklinks to do the following things:
${QuicklinkDefinitions.map((quicklinkDefinition) => "- " + quicklinkDefinition.mdDescription).join("\n")}

To use your created Quicklinks just search for the names you selected and e.g. type the search string / content for a new draft into the search field.
`;

export default function Command() {
  // app installation check (shows Toast if Drafts is not installed)
  checkAppInstallation();
  return (
    <Detail
      markdown={detailText}
      actions={
        <ActionPanel>
          {QuicklinkDefinitions.map((quicklinkDefinition, index) => (
            <Action.CreateQuicklink
              quicklink={{ link: quicklinkDefinition.link }}
              icon={Icon.Plus}
              title={"Create Quicklink to " + quicklinkDefinition.buttonDescription}
              key={index}
            />
          ))}
        </ActionPanel>
      }
    />
  );
}
