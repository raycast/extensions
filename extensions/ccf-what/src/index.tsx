import { List, Action, ActionPanel } from "@raycast/api";
import { useEffect, useState } from "react";
import * as CONST from "./const";
import source = require("./resource/CCF_Ranking_2022.json");

const CCF_RANKING_INS = source as CCFRanking;

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [showingDetail, setShowingDetail] = useState(true);
  const [filteredList, filterList] = useState(CCF_RANKING_INS.list);

  useEffect(() => {
    if (searchText.length >= 2) {
      filterList(CCF_RANKING_INS.list.filter((item) => item.name.toLowerCase().includes(searchText.toLowerCase())));
    }
  }, [searchText]);

  return (
    <List
      isShowingDetail={showingDetail}
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Search Publications"
      searchBarPlaceholder="Your paper is accepted by?"
    >
      {filteredList.map((item, index) => PublicationListItem(item, index))}
    </List>
  );

  function PublicationListItem(props: Publication, index: number) {
    const tier_icon = {
      A: CONST.A_ICON,
      B: CONST.B_ICON,
      C: CONST.C_ICON,
    }[props.rank];
    const type_icon = {
      Conference: CONST.CONF_ICON_DARK,
      Journal: CONST.JOUR_ICON_DARK,
    }[props.type];
    const name = props.name.split(" (")[0];
    const category = CCF_RANKING_INS.category[props.category_id];

    return (
      <List.Item
        key={index}
        icon={tier_icon}
        title={props.abbr}
        accessories={[{ icon: type_icon }, { text: category.chinese }]}
        actions={
          <ActionPanel>
            <Action title="Toggle Detail" onAction={() => setShowingDetail(!showingDetail)} />
            <Action.OpenInBrowser title="Search in DBLP" url={`https://dblp.uni-trier.de/search?q=${props.abbr}`} />
            <Action.CopyToClipboard content={name} shortcut={{ modifiers: ["cmd"], key: "." }} />
          </ActionPanel>
        }
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Abbreviation" text={props.abbr} />
                <List.Item.Detail.Metadata.Label title="Name" text={name} />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Tier" icon={tier_icon} />
                <List.Item.Detail.Metadata.Label title="Category" text={category.english} />
                <List.Item.Detail.Metadata.Label title="分类" text={category.chinese} />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Type" icon={type_icon} text={props.type} />
                <List.Item.Detail.Metadata.Label title="Publisher" text={props.publisher} />
                <List.Item.Detail.Metadata.Separator />
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
    );
  }
}
