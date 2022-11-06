import { Action, ActionPanel, Detail, Icon, useNavigation } from "@raycast/api";

import { CreateVariationRequest } from "../hooks/useOpenAIApi";
import downloadTempFile from "../lib/downloadTempFile";
import { ImagesGrid } from "./ImagesGrid";

export function ImageDetails(props: {
  url: string;
  opt: CreateVariationRequest & { title?: string; variationCount?: number };
}) {
  const { url, opt } = props;

  const { push } = useNavigation();
  async function createVariationAction(url: string, count: number) {
    const file = await downloadTempFile(url);
    push(<ImagesGrid title={opt.title} file={file} n={opt.n.toString()} size={opt.size} variationCount={count + 1} />);
  }

  return (
    <Detail
      markdown={`![](${props.url})`}
      actions={
        <ActionPanel>
          <Action
            icon={Icon.NewDocument}
            title="Create Variation(s)"
            onAction={() => createVariationAction(url, opt.variationCount ?? 0)}
          />
        </ActionPanel>
      }
    />
  );
}
