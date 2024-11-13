import { ActionPanel, closeMainWindow, Action, Icon, List, open } from "@raycast/api";
import { getIcon } from "./invt/resultUtils";
import { useSearch } from "./invt/useSearch";


/*


[
    {
        "accentColorContrast": null,
        "accentColorDarker": null,
        "accentColorLighter": null,
        "category": "Travel",
        "domain": "cabify.com",
        "icon": null,
        "iconSquare": "https://d2xqxjfvpb1oa6.cloudfront.net/eyJidWNrZXQiOiJpbnZpdGF0aW9udXBsb2FkcyIsImtleSI6Imludml0YXRpb24uYXBwLk1vUWxCR1VSNS1pbnZpdGF0aW9uLXByb21vLWNvZGVzXzYxODA0ZTBjNGFmMjY1MDBkN2I2ZmZhZl8zOTIxNDEiLCJlZGl0cyI6eyJyZXNpemUiOnsid2lkdGgiOjI1NiwiaGVpZ2h0IjoyNTYsImZpdCI6ImNvbnRhaW4iLCJ3aXRob3V0RW5sYXJnZW1lbnQiOnRydWV9fX0=",
        "iconSquareAbsolute": "https://d2xqxjfvpb1oa6.cloudfront.net/eyJidWNrZXQiOiJpbnZpdGF0aW9udXBsb2FkcyIsImtleSI6Imludml0YXRpb24uYXBwLk1vUWxCR1VSNS1pbnZpdGF0aW9uLXByb21vLWNvZGVzXzYxODA0ZTBjNGFmMjY1MDBkN2I2ZmZhZl8zOTIxNDEiLCJlZGl0cyI6eyJyZXNpemUiOnsid2lkdGgiOjI1NiwiaGVpZ2h0IjoyNTYsImZpdCI6ImNvbnRhaW4iLCJ3aXRob3V0RW5sYXJnZW1lbnQiOnRydWV9fX0=",
        "iconSquareDefault": "https://d2xqxjfvpb1oa6.cloudfront.net/eyJidWNrZXQiOiJpbnZpdGF0aW9udXBsb2FkcyIsImtleSI6Imludml0YXRpb24uYXBwLk1vUWxCR1VSNS1pbnZpdGF0aW9uLXByb21vLWNvZGVzXzYxODA0ZTBjNGFmMjY1MDBkN2I2ZmZhZl8zOTIxNDEiLCJlZGl0cyI6eyJyZXNpemUiOnsid2lkdGgiOjI1NiwiaGVpZ2h0IjoyNTYsImZpdCI6ImNvbnRhaW4iLCJ3aXRob3V0RW5sYXJnZW1lbnQiOnRydWV9fX0=",
        "linkOrCode": "link",
        "name": "Cabify",
        "photoLarge": "",
        "productSummary": "Cabify is a mobility service similiar to Uber & Bolt! Cabify is available in 8 countries and more than 40 cities around the world",
        "psl": {
            "domain": "cabify.com",
            "input": "cabify.com",
            "listed": true,
            "sld": "cabify",
            "subdomain": null,
            "tld": "com"
        },
        "rewardSummary": "Download the app using a referral link and enjoy the rewards. Referrers and referrals can get 3 EUR discount for the next 3 rides.",
        "s": "cabify",
        "sld": "cabify",
        "slug": "cabify",
        "tags": [
            "travel",
            "ridesharing",
            "transportation",
            "app"
        ],
        "textColor": "",
        "theyGet": "3 EUR discount for the next 3 rides",
        "url": "/cabify",
        "urlAbsolute": "https://invitation.codes/cabify",
        "urlAddAbsolute": "https://invitation.codes/profile/add/cabify",
        "youGet": "3 EUR discount for the next 3 rides"
    },


    */

    export default function Command() {
      const { isLoading, results, search, addHistory, deleteAllHistory, deleteHistoryItem } = useSearch("GENERAL");
    
      return (
        <List 
          isLoading={isLoading} 
          onSearchTextChange={search} 
          searchBarPlaceholder="Search Invitation.app..." // or enter a URL
        >
          <List.Section title="Results" subtitle={results.length.toString()}>
            {results.map((item) => (
              <List.Item
                key={item.id}
                title={item.title || item.name}
                subtitle={item.description}
                icon={item.iconSquareAbsolute || item.icon || Icon.Globe}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Result">
                      <Action
                        title="Open in Browser"
                        onAction={async () => {
                    //      await addHistory(item);
                          await open(String(item.urlAbsolute).replace('://invitation.codes', '://invitation.app') || item.url);
                          await closeMainWindow();
                        }}
                        icon={Icon.ArrowRight}
                      />
                      <Action.CopyToClipboard 
                        title="Copy URL to Clipboard" 
                        content={item.urlAbsolute || item.url} 
                      />
                      <Action.CopyToClipboard 
                        title="Copy Suggestion to Clipboard" 
                        content={item.query} 
                      />
                    </ActionPanel.Section>
    
                    <ActionPanel.Section title="History">
                      {item.isHistory && (
                        <Action
                          title="Remove From History"
                          onAction={async () => {
                            await deleteHistoryItem(item);
                          }}
                          icon={Icon.ExclamationMark}
                          shortcut={{ modifiers: ["cmd"], key: "d" }}
                        />
                      )}
                      <Action
                        title="Clear All History"
                        onAction={async () => {
                          await deleteAllHistory();
                        }}
                        icon={Icon.ExclamationMark}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        </List>
      );
    }