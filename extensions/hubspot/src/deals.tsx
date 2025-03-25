import { Action, ActionPanel, closeMainWindow, Icon, List, open, openExtensionPreferences } from "@raycast/api";
import { useState } from "react";
import { useDeals } from "@/hooks/useDeals";
import { useAccountInfo } from "@/hooks/useAccountInfo";
import type { Deal } from "@/types/deal";

const Detail = ({ deal, hubspotUrl }: { deal: Deal; hubspotUrl: string }) => {
  const dealname = deal?.properties?.dealname;
  const dealstage = deal?.properties?.dealstage;
  const amount = deal?.properties?.amount;
  const createdate = deal?.properties?.createdate;
  const id = deal?.id;

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Deal Name" text={dealname} />
          {dealstage && <List.Item.Detail.Metadata.Label title="Deal Stage" text={dealstage} />}
          {amount && <List.Item.Detail.Metadata.Label title="Amount" text={amount} />}
          {createdate && <List.Item.Detail.Metadata.Label title="Created Date" text={createdate} />}
          {id && <List.Item.Detail.Metadata.Link title="HubSpot Link" text="View in HubSpot" target={hubspotUrl} />}
        </List.Item.Detail.Metadata>
      }
    />
  );
};

export default function Command() {
  const [showingDetail, setShowingDetail] = useState(true);
  const [search, setSearch] = useState("");
  const { isLoading, data } = useDeals({ search });
  const { isLoading: isLoadingAccountInfo, data: dataAccountInfo } = useAccountInfo();

  const deals: Deal[] | undefined = data?.results;

  return (
    <List
      isLoading={isLoading || isLoadingAccountInfo}
      isShowingDetail={showingDetail}
      searchText={search}
      throttle
      onSearchTextChange={(search) => {
        setSearch(search);
      }}
    >
      <List.EmptyView title="No Deals Found" icon="noview.png" />
      {deals?.map((deal) => {
        const dealname = deal?.properties?.dealname;
        const dealstage = deal?.properties?.dealstage;
        const amount = deal?.properties?.amount;
        const createdate = deal?.properties?.createdate;
        const id = deal?.id;
        const hubspotUrl = `https://${dataAccountInfo?.uiDomain}/contacts/${dataAccountInfo?.portalId}/deal/${id}`;

        const props = showingDetail
          ? {
              detail: <Detail deal={deal} hubspotUrl={hubspotUrl} />,
            }
          : {
              accessories: [{ text: dealstage }, { text: amount }, { text: createdate }],
            };

        return (
          <List.Item
            key={deal.id}
            title={dealname}
            subtitle={amount}
            keywords={[dealname, amount]}
            id={deal.id}
            {...props}
            actions={
              <ActionPanel>
                <Action
                  title="Open in Browser"
                  onAction={async () => {
                    await open(hubspotUrl);
                    await closeMainWindow();
                  }}
                  icon={{ source: Icon.ArrowRight }}
                />
                <Action
                  title="Toggle Details"
                  icon={Icon.AppWindowSidebarLeft}
                  onAction={() => setShowingDetail(!showingDetail)}
                />
                <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
