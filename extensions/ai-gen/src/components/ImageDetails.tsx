import {Action, ActionPanel, Detail, Icon, useNavigation} from "@raycast/api";

import {CreateVariationRequest} from "../hooks/useOpenAIApi";
import downloadTempFile from "../lib/downloadTempFile";
import {ImagesGrid} from "./ImagesGrid";

export function ImageDetails(props: {url: string, opt: (CreateVariationRequest & {title?: string;})}) {
  const { url, opt } = props;

  const { push } = useNavigation();
  async function createVariationAction(url: string) {
    const file = await downloadTempFile(url);
    push(<ImagesGrid title={opt.title} file={file} n={opt.n.toString()} size={opt.size} />);
  }

  return (
    <Detail
      markdown={`![](${props.url})`}
      actions={
        <ActionPanel>
          <Action icon={Icon.NewDocument} title="Create Variation(s)" onAction={() => createVariationAction(url)} />
        </ActionPanel>
      }
    />
  )
}
