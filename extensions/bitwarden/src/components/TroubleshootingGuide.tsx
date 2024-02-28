import { ActionPanel, Action, Detail, getPreferenceValues, environment } from "@raycast/api";
import { BugReportCollectDataAction, BugReportOpenAction } from "~/components/actions";
import { BUG_REPORT_URL } from "~/components/actions/BugReportOpenAction";
import { EnsureCliBinError, getErrorString } from "~/utils/errors";

const LINE_BREAK = "\n\n";
const CLI_INSTALLATION_HELP_URL = "https://bitwarden.com/help/cli/#download-and-install";

const getCodeBlock = (content: string) => `\`\`\`\n${content}\n\`\`\``;

type Messages = string | number | false | 0 | "" | null | undefined;

export type TroubleshootingGuideProps = {
  error?: any;
};

const TroubleshootingGuide = ({ error }: TroubleshootingGuideProps) => {
  const errorString = getErrorString(error);
  const localCliPath = getPreferenceValues<Preferences>().cliPath;
  const isCliDownloadError = error instanceof EnsureCliBinError;
  const needsCliInstallGuide = localCliPath || isCliDownloadError;

  const messages: Messages[] = [
    "# 💥 Whoops! Something went wrong",
    `The \`${environment.commandName}\` command crashed when we were not expecting it to.`,
  ];

  if (isCliDownloadError) {
    messages.push("We couldn't download the Bitwarden CLI, you can always install your own by following this guide:");
  }

  if (needsCliInstallGuide) {
    const cliPathString = localCliPath ? `(${localCliPath})` : "";

    messages.push(
      "## Troubleshooting Guide",
      `1. The [Bitwarden CLI](${CLI_INSTALLATION_HELP_URL}) is correctly installed ${cliPathString}`,
      "2. If you did not install the Bitwarden CLI [using Homebrew](https://formulae.brew.sh/formula/bitwarden-cli), please check that the path of the installation matches the `Bitwarden CLI Installation Path` extension setting.",
      "   - 💡 Run the `which bw` command to check your installation path."
    );
  }

  messages.push(
    `**Please try restarting the command. If the issue persists, consider [reporting a bug on GitHub](${BUG_REPORT_URL}) to help us fix it.**`
  );

  if (errorString) {
    const isArchError = /incompatible architecture/gi.test(errorString);
    messages.push(
      ">## Technical details",
      isArchError &&
        "⚠️ We suspect that your Bitwarden CLI was installed using a version of NodeJS that's incompatible with your system architecture (e.g. x64 NodeJS on a M1/Apple Silicon Mac). Please make sure your have the correct versions of your software installed (Homebrew → NodeJS → Bitwarden CLI).",
      getCodeBlock(errorString)
    );
  }

  return (
    <Detail
      markdown={messages.filter(Boolean).join(LINE_BREAK)}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Bug Report">
            <BugReportOpenAction />
            <BugReportCollectDataAction />
          </ActionPanel.Section>
          {needsCliInstallGuide && (
            <>
              <Action.CopyToClipboard title="Copy Homebrew Installation Command" content="brew install bitwarden-cli" />
              <Action.OpenInBrowser title="Open Installation Guide" url={CLI_INSTALLATION_HELP_URL} />
            </>
          )}
        </ActionPanel>
      }
    />
  );
};

export default TroubleshootingGuide;
