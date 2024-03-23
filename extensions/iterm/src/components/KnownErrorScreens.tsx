import "react";

import path from "path";
import { Detail, Grid, Icon, environment } from "@raycast/api";
import { EMPTY_STACK_TRACE } from "../core";
import { ErrorActions } from "./ErrorActions";

// @TODO: This screen should be handled by Raycast itself (https://github.com/raycast/extensions/issues/101)
const permissionErrorMarkdown = /* markdown */ `
## Raycast needs automation access to iTerm.

1. Open **System Settings**
1. Open the **Privacy & Security** Preferences pane
1. Then select the **Automation** tab
1. Expand **Raycast** from the list of applications
1. Ensure the **iTerm** toggle is enabled as shown in the image below
1. When prompted enter your password

![Full Disk Access Preferences Pane](${path.join("file://", environment.assetsPath, "permission-raycast-automation.png")})
`;

const pythonPermissionsMarkdown =
  permissionErrorMarkdown +
  /* markdown */ `
## Iterm Python API Permissions

1. Open **Iterm**
1. Open **Settings** \`⌘.\`
1. Go to **General** -> **Magic**
1. Check the **Enable Python API** checkbox
1. If automation access is granted use **Require "Automation" permission**

![Full Disk Access Preferences Pane](${path.join("file://", environment.assetsPath, "iterm-python-api-permissions.png")})

`;

export const PermissionErrorScreen = ({ pythonPermissions }: { pythonPermissions?: boolean }) => {
  const markdown = pythonPermissions ? pythonPermissionsMarkdown : permissionErrorMarkdown;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={"Permission Issue with Raycast"}
      actions={<ErrorActions actions={["openPrivacyAutomationPane", "close"]} />}
    />
  );
};

export const FinderErrorScreen = ({ reason }: { reason: string | Error }) => {
  return (
    <Grid>
      <Grid.EmptyView
        icon={Icon.Finder}
        title={reason.toString()}
        actions={<ErrorActions actions={["openFinder", "close", "createIssue"]} error={reason} />}
      />
    </Grid>
  );
};

export const GeneralErrorScreen = ({ reason }: { reason: string | Error }) => {
  const stack = reason instanceof Error ? reason.stack : EMPTY_STACK_TRACE;
  const stackTraceMarkdown = "```\n" + stack + "\n```";

  const markdown = `## ${reason.toString()}: \n${stackTraceMarkdown}\n`.replace("`", "'");

  return <Detail markdown={markdown} actions={<ErrorActions actions={["close", "createIssue"]} error={reason} />} />;
};
