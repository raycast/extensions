import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import * as jose from "jose";
import { renderToString } from "react-dom/server";
import { ListFromObject, TokenItem } from "./utils/list-from-object";
import { TokenSvg } from "./components/token-svg";
import { ErrorDetail } from "./components/error-detail";
import { useClipboard, usePreferences } from "raycast-hooks";
import { PleaseCopy } from "./components/please-copy";
import useClaims from "./utils/use-claims";

interface JwtItemDetailProps {
  item: TokenItem;
  clipboard: string | undefined;
  section: number;
}

function JwtMetadata({ item }: JwtItemDetailProps) {
  if (!item.row) {
    return null;
  }
  return <Detail.Metadata.Label title={item.key} text={item.row[1]} />;
}

const JwtView = () => {
  const claims = useClaims();
  const [{ showLogo, showMetadata }, { update }] = usePreferences({ showLogo: false, showMetadata: false });
  const { ready, clipboard } = useClipboard();

  if (ready === false || clipboard === undefined || clipboard.length === 0) {
    return <PleaseCopy ready={ready} />;
  }

  try {
    const header = jose.decodeProtectedHeader(clipboard);
    const data = jose.decodeJwt(clipboard);
    const headItems = ListFromObject(header, claims);
    const dataItems = ListFromObject(data, claims);

    const tokenImg = `<img alt="view token" width="720" src="data:image/svg+xml,${encodeURIComponent(
      renderToString(
        <TokenSvg
          {...{
            clipboard,
            showToken: !showMetadata,
            showLogo: !!showLogo,
            showDetail: true,
          }}
        />
      )
    )}"/>`;

    const metadata = showMetadata && (
      <Detail.Metadata>
        {headItems.map((item) => (
          <JwtMetadata key={item.key} item={item} clipboard={clipboard} section={1} />
        ))}
        {dataItems.map((item) => (
          <JwtMetadata key={item.key} item={item} clipboard={clipboard} section={1} />
        ))}
      </Detail.Metadata>
    );

    return (
      <Detail
        isLoading={!ready}
        markdown={tokenImg}
        metadata={metadata}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action.CopyToClipboard title={`Copy PAYLOAD JSON`} content={JSON.stringify(data, null, 2)} />
              <Action.CopyToClipboard title={`Copy HEADER JSON`} content={JSON.stringify(header, null, 2)} />
              <Action
                icon={showMetadata ? Icon.List : Icon.Sidebar}
                title={`${showMetadata ? "Hide" : "Show"} Key`}
                onAction={() => update("showMetadata", !showMetadata)}
              />
              <Action
                icon={showLogo ? Icon.EyeDisabled : Icon.Eye}
                title={`${showLogo ? "Hide" : "Show"} Logo`}
                onAction={() => update("showLogo", !showLogo)}
              />
            </ActionPanel.Section>
            <ActionPanel.Section title={"PAYLOAD:DATA"}>
              {dataItems.map((item) => (
                <Action.CopyToClipboard
                  key={item.key}
                  title={`Copy ${item.key}${item.row ? ` (${item.row[1]})` : ""} Value`}
                  content={item.value}
                />
              ))}
            </ActionPanel.Section>
            <ActionPanel.Section title={"HEADER:DATA"}>
              {headItems.map((item) => (
                <Action.CopyToClipboard key={item.key} title={`Copy ${item.key} value`} content={item.value} />
              ))}
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  } catch (error) {
    return <ErrorDetail error={error} value={clipboard} />;
  }
};

export default JwtView;
