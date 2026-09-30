import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import semver from "semver";

/** The minimum SnippetsLab app version. Must be valid semver. */
const MIN_APP_VERSION = "2.5.0";

interface InitErrorProps {
    error: Error;
    appVersion?: string;
}

/** Error screen for when the command utility cannot be found or used. */
export function InitError({ error, appVersion }: InitErrorProps) {
    const version = semver.coerce(appVersion);
    const isUnsupportedAppVersion = version && semver.lt(version, MIN_APP_VERSION);
    const unsupportedMessage = `It looks like you are using SnippetsLab ${appVersion}, but
        version **${MIN_APP_VERSION} or later** is required.`;

    const markdown = `
# An error occurred

The \`lab\` command-line utility for SnippetsLab is either missing or lacks the necessary
permissions.

**Details**

${isUnsupportedAppVersion ? unsupportedMessage : ""}

${error.message}

**Troubleshooting Tips**

1.  Ensure that **SnippetsLab ${MIN_APP_VERSION} or later** is installed.
2.  The extension should typically locate the \`lab\` utility bundled with the app automatically.
    You can also manually specify the path in extension preferences.
3.  If using a custom path, it must be an absolute path pointing directly to the \`lab\` binary.
4.  Confirm that the \`lab\` binary has executable permissions.
`;

    return (
        <Detail
            navigationTitle="An error occurred"
            markdown={markdown}
            actions={
                <ActionPanel>
                    <Action.OpenInBrowser
                        title="SnippetsLab Website"
                        url="https://www.renfei.org/snippets-lab/"
                        icon={Icon.Globe}
                    />
                    <Action.OpenInBrowser
                        title="Contact Support"
                        url="mailto:support@renfei.org"
                        icon={Icon.Envelope}
                    />
                </ActionPanel>
            }
        />
    );
}
