import { Action, ActionPanel, List } from "@raycast/api";
import { usePortfolio } from "./hooks/usePortfolio";
import { supportedTokens, tokenDisplayProperties } from "./util/tokens";
import { EthAddressDetail } from "./components/EthAddressDetail";
import { removeFromPortfolio } from "./util/portfolio";

export default function Command() {
  const { portfolio, isLoading, refresh } = usePortfolio();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search addresses..." isShowingDetail>
      {supportedTokens.map((token) => {
        const portfolioToken = portfolio[token];
        const entries = Object.entries(portfolioToken);
        const tokenDisplay = tokenDisplayProperties[token];

        return (
          <List.Section
            key={token}
            title={tokenDisplay.name}
            subtitle={`${entries.length.toString()} address${entries.length !== 1 ? "es" : ""}`}
          >
            {entries.map(([address, addressInfo]) => (
              <List.Item
                key={address}
                title={addressInfo.name}
                icon={{ source: tokenDisplay.image }}
                detail={<EthAddressDetail address={address} name={addressInfo.name} />}
                actions={
                  <ActionPanel title="Portfolio Actions">
                    <Action.CopyToClipboard title="Copy Address" content={address} />
                    <Action
                      title="Remove from Portfolio"
                      onAction={async () => {
                        await removeFromPortfolio(token, address);
                        refresh();
                      }}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}
