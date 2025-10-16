import { Action, ActionPanel, List, Icon } from "@raycast/api";
import React from "react";
import { showFailureToast } from "@raycast/utils";

import { DealDetail } from "./components/deal-detail";
import { useDeals } from "./hooks/use-deals";
import { timeAgo, truncateString } from "./utils/helpers";

// --- Main List Component (displays the list of deals) ---
export default function LatestDeals() {
  const { deals, loading, error, setSearchText } = useDeals();

  // Display an error view if an error occurred
  if (error) {
    showFailureToast(error, { title: "Failed to Load Deals" });
    return (
      <List isLoading={false}>
        <List.EmptyView icon={Icon.ExclamationMark} title="Error" description={error} />
      </List>
    );
  }

  // Main List component for displaying deals
  return (
    <List
      isLoading={loading}
      onSearchTextChange={setSearchText} // Handle live search filtering
      searchBarPlaceholder="Filter deals by title, store, or keywords..."
      throttle // Delay search processing for better performance
    >
      <List.Section title="Latest Deals" subtitle={deals.length > 0 ? `${deals.length} found` : ""}>
        {deals.map((deal) => (
          <List.Item
            key={`${deal.id}-${deal.pubDate.getTime()}`}
            title={truncateString(deal.title.split(" @ ")[0], 50)}
            subtitle={truncateString(deal.store, 30)}
            // Accessories provide additional info on the right side of the list item
            accessories={[
              {
                text: `${deal.netVotes}`,
                icon: deal.netVotes >= 0 ? Icon.ArrowUp : Icon.ArrowDown, // Up or down arrow based on net votes
              },
              {
                text: timeAgo(deal.pubDate), // e.g., "5m ago", "2h ago"
              },
            ]}
            actions={
              <ActionPanel>
                {/* Push to the Detail view when item is selected */}
                <Action.Push title="View Deal Details" icon={Icon.Eye} target={<DealDetail deal={deal} />} />
                <Action.OpenInBrowser url={deal.link} title="Open Deal in Browser" />
                <Action.CopyToClipboard content={deal.link} title="Copy Deal Link" />
                <Action.CopyToClipboard content={deal.title} title="Copy Deal Title" />
                <Action.OpenInBrowser url={`${deal.link}#comments`} title="Open Comments" icon={Icon.SpeechBubble} />
                {deal.imageUrl && <Action.OpenInBrowser url={deal.imageUrl} title="View Image" icon={Icon.Image} />}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
