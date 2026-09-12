import { Action, ActionPanel, Detail } from "@raycast/api";
import { useState, useEffect } from "react";
import { useIpfsContent } from "../apis";
import { ipfsLinkToHttpLink } from "../utils/ipfs";

export default function IpfsDetail({ ipfsLink }: { ipfsLink?: string }) {
  const [text, setText] = useState<string>();
  const { data, isLoading } = useIpfsContent(ipfsLink);

  useEffect(() => {
    if (data) {
      try {
        const jsonText = JSON.stringify(JSON.parse(data), null, 2);
        setText(jsonText);
      } catch {
        setText(data as string);
      }
    }
  }, [data]);

  const markdown = `\`\`\`json
${isLoading ? "Loading..." : text}
\`\`\`
`;
  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={ipfsLink}
      actions={
        <ActionPanel>
          {ipfsLink && (
            <Action.CopyToClipboard
              title="Copy IPFS URI"
              content={ipfsLink}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          )}
          {ipfsLink && (
            <Action.CopyToClipboard
              title="Copy IPFS URI in HTTP Gateway"
              content={ipfsLinkToHttpLink(ipfsLink)}
              shortcut={{ modifiers: ["cmd"], key: "," }}
            />
          )}
          {data && (
            <Action.CopyToClipboard
              title="Copy IPFS Content"
              content={data}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
