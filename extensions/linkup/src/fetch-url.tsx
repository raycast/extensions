import { Detail, LaunchProps } from "@raycast/api";
import { PageDetail } from "./components/page-detail";
import { formatLinkupError, normalizeUrl } from "./linkup";

export default function Command(props: LaunchProps<{ arguments: Arguments.FetchUrl }>) {
  let url: string;
  try {
    url = normalizeUrl(props.arguments.url);
  } catch (error) {
    return <Detail markdown={`# Invalid URL\n\n${formatLinkupError(error)}`} />;
  }

  return <PageDetail url={url} />;
}
