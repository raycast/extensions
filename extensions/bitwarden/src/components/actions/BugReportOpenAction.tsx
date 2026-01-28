import { Action } from "@raycast/api";

export const BUG_REPORT_URL =
  "https://github.com/raycast/extensions/issues/new?assignees=&labels=extension%2Cbug&template=extension_bug_report.yml&title=%5BBitwarden%5D+...";

function BugReportOpenAction() {
  return <Action.OpenInBrowser title="Open Bug Report" url={BUG_REPORT_URL} />;
}

export default BugReportOpenAction;
