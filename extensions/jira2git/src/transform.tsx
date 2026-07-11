import { showHUD, Clipboard, showToast, Toast } from "@raycast/api";
import { ErrorText } from "./utils/exception";
import { jiraFetchObject } from "./utils/jira";

const defaultPrefix = "feature";

interface Issue {
  id: string;
  key: string;
  fields: {
    summary: string;
  };
}

interface TransformProps {
  arguments: {
    prefix?: string;
    url: string;
  };
}

const getIssueDetail = async (id: string) => {
  const result = await jiraFetchObject<Issue>(
    `/rest/api/2/issue/${id}`,
    {},
    { 400: ErrorText("Invalid ID", "Unknown issue") }
  );
  return result;
};

const getIssueTitle = async (id: string) => {
  const issue = await getIssueDetail(id);
  const summary = issue.fields.summary;
  const symbolRegex = /[^\w\s]/gi;
  const title = summary
    .replace(symbolRegex, " ")
    .trim()
    .split(" ")
    .filter((word) => word)
    .map((word) => word.toLowerCase())
    .join("-");
  return title;
};

const transformUrlToIssueId = (url: string) => {
  const issueIdRegex = /([A-Z][A-Z0-9]+-[0-9]+)/g;
  const issueId = url.match(issueIdRegex);
  return issueId?.length ? issueId[0] : "";
};

const TransformCommand = async (props: TransformProps) => {
  const { prefix, url } = props.arguments;
  const issueId = transformUrlToIssueId(url);

  if (!issueId) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid URL format",
      message: "Please try with a new URL",
    });
    return;
  }

  const title = await getIssueTitle(issueId);
  const branchName = `${prefix || defaultPrefix}/${issueId}-${title}`;
  await Clipboard.copy(branchName);
  await showHUD("Copied branch name to clipboard");
};

export default TransformCommand;
