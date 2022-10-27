import { showHUD, Clipboard } from "@raycast/api";

const defaultPrefix = "feature";

interface TransformProps {
  arguments: {
    prefix?: string;
    url: string;
  };
}

const getCardTitle = () => {
  return "";
};

const transformUrlToCode = (url: string) => {
  // https://jira.net/browse/W220037-6
  return url;
};

export default async function Transform(props: TransformProps) {
  const { prefix = defaultPrefix, url } = props.arguments;
  const code = transformUrlToCode(url);
  const title = getCardTitle();
  const branchName = `${prefix}/${code}-${title}`;
  await Clipboard.copy(branchName);
  await showHUD("Copied branch name to clipboard");
}
