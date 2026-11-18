import { ActionPanel, Detail, Action } from "@raycast/api";
import { License } from "./types";

export function LicenseDetailView({ license }: { license: License }) {
  const markdown = `
## ${license.name}

${license.info}

---

${license.content}  
`;

  return (
    <Detail
      navigationTitle={license.name}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="License" text={license.name} />
          <Detail.Metadata.Label title="TL;DR" text={license.subtitle} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="choosealicense.com" target={license.url} text={license.name} />
        </Detail.Metadata>
      }
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={license.content} />
          <Action.OpenInBrowser url={license.url} />
        </ActionPanel>
      }
    />
  );
}
