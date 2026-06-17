import { Action, ActionPanel, Grid, Icon, List } from "@raycast/api";

import BrawlerComponent from "./BrawlerDetail";
import { useEffect, useState } from "react";
import IBrawlers from "../models/IBrawler";
import { searchListBrawlers } from "../Utils/brawlersUtils";

const BrawlerListComponent = () => {
  const [listBrawlers, setListBrawlers] = useState<IBrawlers[]>();

  useEffect(() => {
    const fetchBrawlersData = async () => {
      try {
        const data = await searchListBrawlers();
        setListBrawlers(data);
      } catch (error) {
        console.log(error);
      }
    };

    fetchBrawlersData();
  }, []);

  if (!listBrawlers) {
    return (
      <List>
        <List.EmptyView icon={Icon.CircleProgress} title="Loading Brawlers Data" description="Work in progress." />
      </List>
    );
  }

  if (listBrawlers[0].name == "") {
    return (
      <List>
        <List.EmptyView description="Could not find any brawlers." icon={Icon.Airplane} title="No brawlers found" />
      </List>
    );
  } else {
    return (
      <Grid
        throttle
        searchBarPlaceholder="Search Brawlers By Bame"
        navigationTitle="Brawlers List"
        fit={Grid.Fit.Fill}
        columns={7}
      >
        <Grid.Section title="Brawlers">
          {listBrawlers.map((brawler) => {
            return (
              <Grid.Item
                key={brawler.id}
                content={brawler.imageUrl2}
                title={brawler.name}
                keywords={[brawler.id.toString(), brawler.name]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Show Details"
                      icon={Icon.Sidebar}
                      target={<BrawlerComponent brawlerData={brawler} />}
                    />
                    <Action.OpenInBrowser title="Open Brawler on Brawlify" icon={Icon.Globe} url={brawler.link} />
                  </ActionPanel>
                }
              />
            );
          })}
        </Grid.Section>
      </Grid>
    );
  }
};
export default BrawlerListComponent;
