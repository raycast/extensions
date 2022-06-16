import { Color, getPreferenceValues, List } from "@raycast/api";
import React, { useState } from "react";
import { getBunches, getBunchFolder, getIsShowDetail } from "./hooks/hooks";
import { ActionOnBunches } from "./components/action-on-bunches";
import { EmptyView } from "./components/empty-view";
import { bunchesTag } from "./utils/constants";
import { bunchInstalled, getBunchesContent } from "./utils/common-utils";
import { Preferences } from "./types/preferences";
import { BunchNotInstallView } from "./components/bunch-not-install-view";

export default function SearchAllBunches() {
  const { rememberFilter, closeMainWindow } = getPreferenceValues<Preferences>();
  const [filter, setFilter] = useState<string>("");
  const [searchContent, setSearchContent] = useState<string>("");
  const [refresh, setRefresh] = useState<number>(0);
  const { bunches, openBunches, loading } = getBunches(refresh, searchContent);
  const { showDetail } = getIsShowDetail(refresh);
  const { bunchFolder } = getBunchFolder();

  return bunchInstalled() ? (
    <List
      isLoading={loading}
      isShowingDetail={showDetail}
      searchBarPlaceholder={"Search bunches name, tag:tag1+tag2, tag:tag1,tag2"}
      searchBarAccessory={
        <List.Dropdown onChange={setFilter} tooltip={"Filter Tag"} storeValue={rememberFilter}>
          {bunchesTag.map((value) => {
            return <List.Dropdown.Item key={value.value} title={value.title} value={value.value} />;
          })}
        </List.Dropdown>
      }
      onSearchTextChange={setSearchContent}
      enableFiltering={!searchContent.startsWith("tag:")}
    >
      <EmptyView title={"No Bunches"} extensionPreferences={true} />
      <List.Section title={"Running"}>
        {bunches.map((value, index) => {
          return (
            (filter === bunchesTag[0].value || filter === value.isOpen + "") &&
            value.isOpen && (
              <List.Item
                icon={{ source: "list-icon.svg", tintColor: value.isOpen ? Color.Green : undefined }}
                key={index}
                title={value.name}
                detail={<List.Item.Detail markdown={`${getBunchesContent(bunchFolder, value.name)}`} />}
                actions={
                  <ActionOnBunches
                    bunches={value}
                    openBunches={openBunches}
                    setRefresh={setRefresh}
                    showDetail={showDetail}
                    closeMainWindow={closeMainWindow}
                  />
                }
              />
            )
          );
        })}
      </List.Section>
      <List.Section title={"Closed"}>
        {bunches.map((value, index) => {
          return (
            (filter === bunchesTag[0].value || filter === value.isOpen + "") &&
            !value.isOpen && (
              <List.Item
                icon={{ source: "list-icon.svg", tintColor: value.isOpen ? Color.Green : undefined }}
                key={index}
                title={value.name}
                detail={<List.Item.Detail markdown={`${getBunchesContent(bunchFolder, value.name)}`} />}
                actions={
                  <ActionOnBunches
                    bunches={value}
                    openBunches={openBunches}
                    setRefresh={setRefresh}
                    showDetail={showDetail}
                    closeMainWindow={closeMainWindow}
                  />
                }
              />
            )
          );
        })}
      </List.Section>
    </List>
  ) : (
    <List>
      <BunchNotInstallView extensionPreferences={true} />
    </List>
  );
}
