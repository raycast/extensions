import { List } from "@raycast/api";
import SearchAPIResponseType from "../models/SearchAPIResponseType";
import {
  MODRINTH_API_URL,
  MODRINTH_BASE_URL,
  modrinthColors,
  newlinePlaceholder,
  projectDropdown,
  SortingType,
  SortingTypes,
} from "../utils/constants";
import { timeAgo } from "../utils/functions";
import { NodeHtmlMarkdown } from "node-html-markdown";
import { useState } from "react";
import { useFetch } from "@raycast/utils";
import ProjectAPIResponseType from "../models/ProjectAPIResponseType";
import { ListAPIResponse } from "../models/ListAPIResponse";
import DetailView from "./DetailView";
import ListDropdown from "../components/ListDropdown";
import ProjectInteractionMenu from "../components/ProjectInteractionMenu";

export default function SearchView() {
  const nhm = new NodeHtmlMarkdown();
  const [searchText, setSearchText] = useState("");
  const [itemId, setItemId] = useState("");
  const [sortingType, setSortingType] = useState<SortingType>("relevance");
  const [projectType, setProjectType] = useState("mod");

  const listDataSearchParams = new URLSearchParams({
    query: searchText,
    facets: `[["project_type:${projectType}"]]`,
    index: SortingTypes[sortingType].value,
    limit: "50",
  });

  const {
    data: listData,
    isLoading: listDataIsLoading,
    revalidate: revalidateList,
  } = useFetch<ListAPIResponse>(`${MODRINTH_API_URL}search?${listDataSearchParams}`);

  const {
    data: itemData,
    isLoading: itemDataIsLoading,
    error: itemDataError,
    revalidate: revalidateItem,
  } = useFetch<ProjectAPIResponseType>(`${MODRINTH_API_URL}project/${itemId}`);

  return (
    <List
      isShowingDetail
      searchText={searchText}
      searchBarPlaceholder={`Search for ${projectDropdown.find((curr) => curr.id == projectType)?.name ?? "Projects"}...`}
      throttle={true}
      onSearchTextChange={(text) => {
        setSearchText(text);
        revalidateList();
      }}
      isLoading={listDataIsLoading}
      onSelectionChange={(selection) => {
        setItemId(selection ? selection : "");
        revalidateItem();
      }}
      searchBarAccessory={
        <ListDropdown
          onDropdownChange={setProjectType}
          title={"Project Types"}
          dropdownChoiceTypes={projectDropdown}
          tooltip={"Select project type..."}
          defaultValue={"mod"}
          storeValue={true}
        />
      }
    >
      <List.Section
        title={SortingTypes[sortingType].label}
        subtitle={`${listData?.hits.length.toString()}${listData?.hits && listData.hits.length >= 50 ? "+" : ""} results`}
      >
        {listData?.hits?.map((item: SearchAPIResponseType) => (
          <List.Item
            key={item.project_id}
            icon={item.icon_url}
            subtitle={item.versions.filter((str) => !/[a-zA-Z]/.test(str)).at(-1)}
            title={item.title}
            id={item.project_id}
            actions={
              <ProjectInteractionMenu
                itemData={itemData ?? null}
                setSortingType={setSortingType}
                projectType={projectType}
                detailsTarget={<DetailView itemData={itemData ?? null} nhm={nhm} projectType={projectType} />}
              />
            }
            detail={
              <List.Item.Detail
                isLoading={itemDataIsLoading}
                markdown={
                  itemDataIsLoading || itemDataError || !itemData || !itemData.body
                    ? ""
                    : nhm
                        .translate(itemData?.body.replaceAll("\n", newlinePlaceholder) ?? "")
                        .replaceAll(newlinePlaceholder, "\n")
                        .replace(/\\/g, "")
                }
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Link
                      title={"Author"}
                      text={item.author}
                      target={`${MODRINTH_BASE_URL}user/${item.author}`}
                    />
                    <List.Item.Detail.Metadata.Label title={"Description"} text={item.description} />
                    <List.Item.Detail.Metadata.Label title={"Downloads"} text={item.downloads.toLocaleString()} />
                    <List.Item.Detail.Metadata.Label title={"Last Updated"} text={timeAgo(item.date_modified)} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.TagList
                      title={"Platforms"}
                      children={itemData?.loaders.map((curr) => (
                        <List.Item.Detail.Metadata.TagList.Item
                          text={curr.charAt(0).toUpperCase() + curr.slice(1)}
                          color={modrinthColors.get(curr) ?? modrinthColors.get("default")}
                          key={curr}
                          icon={{
                            source: `${curr}.svg`,
                            tintColor: modrinthColors.get(curr) ?? modrinthColors.get("default"),
                          }}
                        />
                      ))}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        )) || <List.Item title="Loading..." />}
      </List.Section>
    </List>
  );
}
