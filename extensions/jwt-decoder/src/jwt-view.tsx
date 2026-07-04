import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { TokenItem } from "./utils/list-from-object";
import { renderTokenSvgToString } from "./components/token-svg";
import { DecodedJwtGate } from "./components/decoded-jwt-gate";
import { usePreferences } from "raycast-hooks";
import useDecodedJwt from "./utils/use-decoded-jwt";

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
  const decoded = useDecodedJwt();
  const [{ showLogo, showMetadata }, { update }] = usePreferences({ showLogo: false, showMetadata: false });

  return (
    <DecodedJwtGate decoded={decoded}>
      {({ ready, clipboard, header, data, headerItems: headItems, dataItems }) => {
        let tokenImg: string;
        try {
          tokenImg = `<img alt="view token" width="720" src="data:image/svg+xml,${encodeURIComponent(
            renderTokenSvgToString({ clipboard, showToken: !showMetadata, showLogo: !!showLogo, showDetail: true }),
          )}"/>`;
        } catch {
          tokenImg = "";
        }

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
                    <Action.CopyToClipboard key={item.key} title={`Copy ${item.key} Value`} content={item.value} />
                  ))}
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      }}
    </DecodedJwtGate>
  );
};

export default JwtView;
