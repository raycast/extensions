import { Action, ActionPanel, Detail, Icon, useNavigation } from "@raycast/api";
import { useMemo } from "react";
import { isUrl } from "./isUrl";
import { toDataUrl } from "./toDataUrl";

interface Props {
  text: string;
  imagePath: string;
}

export default function ResultView({ text, imagePath }: Props) {
  const { pop } = useNavigation();
  const linkable = isUrl(text);
  const dataUrl = useMemo(() => toDataUrl(imagePath), [imagePath]);
  const markdown = `![QR Code](${dataUrl}?raycast-height=260)`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Decoded Content" text={text} />
          {linkable && <Detail.Metadata.Link title="Link" target={text} text="Open in browser" />}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy to Clipboard" content={text} icon={Icon.Clipboard} />
          {linkable && <Action.OpenInBrowser title="Open in Browser" url={text} icon={Icon.Globe} />}
          <Action title="Back" icon={Icon.ArrowLeft} shortcut={{ modifiers: ["cmd"], key: "[" }} onAction={pop} />
        </ActionPanel>
      }
    />
  );
}
