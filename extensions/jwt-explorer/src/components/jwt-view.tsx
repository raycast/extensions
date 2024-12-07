import { Action, ActionPanel, Detail, getPreferenceValues, Icon } from "@raycast/api";
import * as jose from "jose";
import json from "json-keys-sort";
import { usePreferences } from "raycast-hooks";

import { ErrorDetail } from "./error-detail";
import { ListFromObject, TokenItem } from "../utils/list-from-object";
import useClaims from "../utils/use-claims";

interface ExtSettings {
  sortJwtContent: boolean;
}

interface JwtItemDetailProps {
  item: TokenItem;
  token: string | undefined;
  section: number;
}

function JwtMetadata({ item }: JwtItemDetailProps) {
  if (!item.row) {
    return null;
  }
  return <Detail.Metadata.Label title={item.key} text={item.row[1]} />;
}

interface JwtViewProps {
  jwtToken: string;
}

export const JwtView = ({ jwtToken }: JwtViewProps) => {
  const claims = useClaims();
  const [{ showMetadata }, { update }] = usePreferences({ showMetadata: false });
  const extSettings = getPreferenceValues<ExtSettings>();

  try {
    const header = jose.decodeProtectedHeader(jwtToken);
    const payload = jose.decodeJwt(jwtToken);
    const headItems = ListFromObject(header, claims);
    const payloadItems = ListFromObject(payload, claims);

    const headerStr = JSON.stringify(json.sort(header, extSettings.sortJwtContent), null, 4);
    const payloadStr = JSON.stringify(json.sort(payload, extSettings.sortJwtContent), null, 4);
    const formatedMdStr = `
## Payload
\`\`\`json
${payloadStr}
\`\`\`

## Header
\`\`\`json
${headerStr}
\`\`\``;

    const metadata = showMetadata && (
      <Detail.Metadata>
        {headItems.map((item) => (
          <JwtMetadata key={item.key} item={item} token={jwtToken} section={1} />
        ))}
        {payloadItems.map((item) => (
          <JwtMetadata key={item.key} item={item} token={jwtToken} section={1} />
        ))}
      </Detail.Metadata>
    );

    return (
      <Detail
        isLoading={false}
        markdown={formatedMdStr}
        metadata={metadata}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action.Paste title="Past Decoded Payload" content={payloadStr}></Action.Paste>
              <Action.CopyToClipboard title={`Copy Decoded Payload`} content={payloadStr} />
              <Action.CopyToClipboard title={`Copy Decoded Header`} content={headerStr} />
              <Action
                icon={showMetadata ? Icon.List : Icon.Sidebar}
                title={`${showMetadata ? "Hide" : "Show"} Standard Fields Reference`}
                onAction={() => update("showMetadata", !showMetadata)}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  } catch (error) {
    return <ErrorDetail error={error} value={jwtToken} />;
  }
};
