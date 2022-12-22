import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import { useState } from "react";
import { useDeals } from "./hooks/useDeals";
import { Deal } from "./types/deal";

const Detail = ({ deal }: { deal: Deal }) => {
  const dealname = deal?.properties?.dealname;
  const dealstage = deal?.properties?.dealstage;
  const amount = deal?.properties?.amount;
  const createdate = deal?.properties?.createdate;

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Deal Name" text={dealname} />
          {dealstage && <List.Item.Detail.Metadata.Label title="Deal Stage" text={dealstage} />}
          {amount && <List.Item.Detail.Metadata.Label title="Amount" text={amount} />}
          {createdate && <List.Item.Detail.Metadata.Label title="Created Date" text={createdate} />}
        </List.Item.Detail.Metadata>
      }
    />
  );
};

export default function Command() {
  const [showingDetail, setShowingDetail] = useState(true);
  const [search, setSearch] = useState("");
  const { isLoading, data } = useDeals({ search });

  const deals: Deal[] | undefined = data?.results;

  return (
    <List
      isLoading={isLoading}
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

        const props = showingDetail
          ? {
              detail: <Detail deal={deal} />,
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
