import { Color, getPreferenceValues, List } from "@raycast/api";
import { useState } from "react";
import { getAllWorkflows, getIsShowDetail } from "./hooks/hooks";
import { ActionOnWorkflow } from "./components/action-on-workflow";
import { EmptyView } from "./components/empty-view";
import { AppNotInstallView } from "./components/app-not-install-view";
import { appInstalled } from "./utils/common-utils";
import { DetailView } from "./components/detail-view";
import { filterTag } from "./utils/constants";

export default function SearchAllBunches() {
  const { rememberFilter } = getPreferenceValues<Preferences.SearchWorkflows>();
  const [filter, setFilter] = useState<string>("");
  const [refresh, setRefresh] = useState<number>(0);
  const [refreshDetail, setRefreshDetail] = useState<number>(0);
  const { showDetail } = getIsShowDetail(refreshDetail);
  const { workflows, loading } = getAllWorkflows(refresh);

  return appInstalled() ? (
    <List
      isLoading={loading}
      isShowingDetail={showDetail && workflows.length > 0}
      searchBarPlaceholder={"Search workflows"}
      searchBarAccessory={
        <List.Dropdown onChange={setFilter} tooltip={"Filter Tag"} storeValue={rememberFilter}>
          {filterTag.map((value) => {
            return <List.Dropdown.Item key={value.value} title={value.title} value={value.value} />;
          })}
        </List.Dropdown>
      }
    >
      <EmptyView title={"No Workflow"} extensionPreferences={true} />
      <List.Section title={"Active"}>
        {workflows.map((value, index) => {
          return (
            value.active &&
            (filter === filterTag[0].value || filter.toString() === filterTag[1].value) && (
              <List.Item
                icon={{ source: "list-icon.svg", tintColor: value.active ? Color.Green : undefined }}
                key={index}
                title={value.name}
                detail={<DetailView workflow={value} />}
                actions={
                  <ActionOnWorkflow
                    workflow={value}
                    setRefresh={setRefresh}
                    setRefreshDetail={setRefreshDetail}
                    showDetail={showDetail}
                  />
                }
              />
            )
          );
        })}
      </List.Section>
      <List.Section title={"Not Active"}>
        {workflows.map((value, index) => {
          return (
            !value.active &&
            (filter === filterTag[0].value || filter.toString() === filterTag[2].value) && (
              <List.Item
                icon={{ source: "list-icon.svg", tintColor: value.active ? Color.Green : undefined }}
                key={index}
                title={value.name}
                detail={<DetailView workflow={value} />}
                actions={
                  <ActionOnWorkflow
                    workflow={value}
                    setRefresh={setRefresh}
                    setRefreshDetail={setRefreshDetail}
                    showDetail={showDetail}
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
      <AppNotInstallView extensionPreferences={true} />
    </List>
  );
}
