import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { TokenItem } from "./utils/list-from-object";
import { renderTokenSvgToString } from "./components/token-svg";
import { DecodedJwtGate } from "./components/decoded-jwt-gate";
import { ErrorDetail } from "./components/error-detail";
import { usePreferences } from "raycast-hooks";
import useDecodedJwt from "./utils/use-decoded-jwt";

interface JwtItemDetailProps {
  item: TokenItem;
}

function JwtMetadata({ item }: JwtItemDetailProps) {
  if (!item.row) {
    return null;
  }
  return <Detail.Metadata.Label title={item.key} text={item.row[1]} />;
}

const JwtView = () => {
  const decoded = useDecodedJwt();
  const [{ showMetadata }, { update }] = usePreferences({ showMetadata: false });

  return (
    <DecodedJwtGate decoded={decoded}>
      {({ ready, clipboard, header, data, headerItems: headItems, dataItems }) => {
        let tokenImg: string;
        try {
          tokenImg = `<img alt="view token" width="720" src="data:image/svg+xml,${encodeURIComponent(
            renderTokenSvgToString({ clipboard, showToken: !showMetadata, showDetail: true }),
          )}"/>`;
        } catch (e) {
          return <ErrorDetail error={e} value={clipboard} />;
        }

        const metadata = showMetadata && (
          <Detail.Metadata>
            {headItems.map((item) => (
              <JwtMetadata key={item.key} item={item} />
            ))}
            {dataItems.map((item) => (
              <JwtMetadata key={item.key} item={item} />
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
