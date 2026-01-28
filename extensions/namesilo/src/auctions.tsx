import { Action, ActionPanel, Color, Detail, Icon, List } from "@raycast/api";
import useNameSilo from "./lib/hooks/useNameSilo";
import { NAMESILO_IMAGE } from "./lib/constants";
import { Auction, AuctionStatus, type ViewAuction } from "./lib/types";
import dayjs from "dayjs";

export default function Auctions() {
  type AuctionsResponse = { body: Auction[] };
  const { isLoading, data } = useNameSilo<AuctionsResponse>("listAuctions");
  const auctions = data?.body || [];

  function getAuctionColor(auction: Auction) {
    if (dayjs().isAfter(auction.auctionEndsOn)) return Color.Red;
    const days = dayjs().diff(auction.auctionEndsOn, "day");
    if (days < 8) return Color.Yellow;
    return Color.Green;
  }

  function getAuctionStatusText(status: AuctionStatus) {
    switch (status) {
      case 2:
        return "Expired domain active";
      case 3:
        return "Auction closed winner";
      case 9:
        return "Customer sale active";
      case 11:
        return "Sale waiting";
      case 16:
        return "Auction closed active payment plan";
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search auction">
      <List.Section title={`${auctions.length} auctions`}>
        {auctions.map((auction) => (
          <List.Item
            key={auction.id}
            icon={{ source: Icon.Dot, tintColor: getAuctionColor(auction) }}
            title={auction.domain}
            subtitle={auction.typeId === 1 ? "Customer auction" : "Expired domain auction"}
            accessories={[
              { text: getAuctionStatusText(auction.statusId) },
              {
                text: {
                  value: getAuctionColor(auction) === Color.Red ? "ended" : "ends",
                  color: getAuctionColor(auction),
                },
              },
              { date: new Date(auction.auctionEndsOn) },
            ]}
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.Eye} title="View Auction" target={<ViewAuction auctionId={auction.id} />} />
                <Action.OpenInBrowser icon={NAMESILO_IMAGE} url={auction.url} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function ViewAuction({ auctionId }: { auctionId: number }) {
  const { isLoading, data } = useNameSilo<{ body: ViewAuction }>("viewAuction", {
    auctionId: auctionId.toString(),
  });
  const markdown = !data
    ? ""
    : `

---
### ${data.body.errors[0]?.message || ""}

| Min Bid | Current Bid | Max Bid |
|---------|-------------|---------|
| ${data.body.minBid} | ${data.body.currentBid} | ${data.body.maxBid} |
`;
  return (
    <Detail
      isLoading={isLoading}
      markdown={`## Auctions / ${auctionId} / View` + markdown}
      metadata={
        data && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Auth Key" text={data.body.authKey} />
            <Detail.Metadata.Label title="Valid" text={data.body.isValid ? "✅" : "❌"} />
            <Detail.Metadata.Label title="Private" text={data.body.isPrivate ? "✅" : "❌"} />
            <Detail.Metadata.Label title="Show Reserve" text={data.body.showReserve ? "✅" : "❌"} />
          </Detail.Metadata>
        )
      }
    />
  );
}
