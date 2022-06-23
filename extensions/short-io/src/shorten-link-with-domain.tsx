import { Action, ActionPanel, Color, Icon, List, LocalStorage } from "@raycast/api";
import React, { useState } from "react";
import { getAllDomains, getDefaultDomain } from "./hooks/hooks";
import ShortenLink from "./shorten-link";
import { isEmpty } from "./utils/common-utils";
import { ActionOpenPreferences } from "./components/action-open-preferences";
import { ActionGoShortIo } from "./components/action-go-short-io";
import { ListEmptyView } from "./components/list-empty-view";
import { LocalStorageKey } from "./utils/constants";

export default function ShortenLinkWithDomain() {
  const [refreshDomain, setRefreshDomain] = useState<string>("");

  const { defaultDomain, domainLoading } = getDefaultDomain(refreshDomain);
  const { domains, loading } = getAllDomains();

  return (
    <List
      isLoading={loading && domainLoading}
      isShowingDetail={domains.length !== 0 && true}
      searchBarPlaceholder={"Search domains, ☆ is default domain of  𝐒𝐡𝐨𝐫𝐭𝐞𝐧 𝐋𝐢𝐧𝐤 and 𝐒𝐞𝐚𝐫𝐜𝐡 𝐋𝐢𝐧𝐤𝐬 command"}
    >
      <ListEmptyView
        title={"No Domain"}
        icon={{ source: { light: "empty-domain-icon.svg", dark: "empty-domain-icon@dark.svg" } }}
      />
      {domains.map((value, index) => {
        return (
          <List.Item
            key={index}
            icon={{ source: { light: "domain-icon.svg", dark: "domain-icon@dark.svg" } }}
            title={value.hostname}
            accessories={[
              value.hostname === defaultDomain || (defaultDomain === "" && index === 0)
                ? {
                    icon: { source: Icon.Star, tintColor: Color.Yellow },
                    tooltip: "Default Domain of 𝐒𝐡𝐨𝐫𝐭𝐞𝐧 𝐋𝐢𝐧𝐤 and 𝐒𝐞𝐚𝐫𝐜𝐡 𝐋𝐢𝐧𝐤𝐬 command",
                  }
                : {},
            ]}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    {!isEmpty(value.title) && (
                      <>
                        <List.Item.Detail.Metadata.Label title={"Title"} text={value.title + ""} />
                        <List.Item.Detail.Metadata.Separator />
                      </>
                    )}
                    <List.Item.Detail.Metadata.Label title={"Domain"} text={value.hostname} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title={"Domain Id"} text={value.id + ""} />
                    <List.Item.Detail.Metadata.Separator />
                    {!isEmpty(value.TeamId) && (
                      <>
                        <List.Item.Detail.Metadata.Label title={"Team ID"} text={value.TeamId + ""} />
                        <List.Item.Detail.Metadata.Separator />
                      </>
                    )}
                    <List.Item.Detail.Metadata.Label title={"Link Type"} text={value.linkType} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title={"Setup Type"} text={value.setupType} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title={"Created At"}
                      text={value.createdAt.substring(0, 19).replace("T", " ")}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title={"Updated At"}
                      text={value.updatedAt.substring(0, 19).replace("T", " ")}
                    />
                    <List.Item.Detail.Metadata.Separator />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.Push
                  title={"Shorten Link"}
                  icon={Icon.Link}
                  target={<ShortenLink paraDomain={value.hostname} />}
                />
                <Action
                  icon={Icon.Star}
                  title={"Set Default Domain"}
                  onAction={async () => {
                    await LocalStorage.setItem(LocalStorageKey.DEFAULT_DOMAIN, JSON.stringify(value));
                    setRefreshDomain(value.hostname);
                  }}
                />
                <ActionGoShortIo />
                <ActionOpenPreferences />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
