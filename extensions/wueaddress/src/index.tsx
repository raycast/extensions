import {
  ActionPanel,
  Action,
  List,
} from "@raycast/api";
import { useState, useEffect } from "react";
import axios from "axios";
import * as cheerio from "cheerio";
import { wueIconData } from "./imageData";

interface SearchResult {
  title: string;
  phones: string[];
  emails: string[];
  workplaces: string[];
  academicTitle: string;
}

export default function Command() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<SearchResult[] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const fetchHTMLContent = async (query: string) => {
    setIsLoading(true);
    setError(undefined);
  
    try {
      const url = "https://wueaddress.uni-wuerzburg.de/search/person";
      const params = query ? { q: query } : undefined;
      const response = await axios.get(url, { params });
  
      const results = collectData(response.data);
      setSearchResults(results);
      setError(undefined);
    } catch (error) {
      setSearchResults(undefined);
      setError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (searchQuery) {
      fetchHTMLContent(searchQuery);
    } else {
      setSearchResults(undefined);
      setError(undefined);
    }
  }, [searchQuery]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchQuery}
      searchBarPlaceholder="Search for a contact..."
      navigationTitle="WueAddress"
      isShowingDetail={searchQuery !== ""}
    >
      {error && (
        <List.Section title="Error">
          <List.Item title={error} icon="error.png" />
        </List.Section>
      )}
  
      {(!isLoading && searchQuery === "" && (!searchResults || searchResults.length === 0)) ? (
        <List.EmptyView
          icon={{ source: wueIconData }}
          title="Type something to get started"
        />
      ) : (
        searchResults?.map((result, index) => (
        <List.Item
        key={`${result.title}_${index}`}
          title={result.title}
          subtitle={result.workplaces.join(", ")}
          actions={
            <ActionPanel>
              {result.emails.map((email) => (
                <Action.Open
                  key={email}
                  icon="AtSymbol"
                  title={`Write Email`}
                  target={`mailto:${email}`}
                />
              ))}
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Name" text={result.title}/>
                  {result.workplaces.map((workplace) => (
                    <>
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Workplace" text={workplace}/>
                    </>
                  ))}
                  {result.phones.map((phone) => (
                    <>
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Phone" text={phone}/>
                    </>
                  ))}
                  {result.emails.map((email) => (
                    <>
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Email" text={email}/>
                    </>
                  ))}
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      )))}
    </List>
  );
}

function collectData(html: string): SearchResult[] {
  const $ = cheerio.load(html);
  const searchResultListItems = $(".search_result_list_item");
  const results: SearchResult[] = [];

  searchResultListItems.each((_index, item) => {
    const titleElement = $(item).find("a.title");
    let title = titleElement.text().trim();

    const phoneElements = $(item).find("span.phone");
    const phones = phoneElements.map((_i, elem) => $(elem).text().trim()).get();

    const emailElements = $(item).find("span.email");
    const emails = emailElements.map((_i, elem) => $(elem).text().trim()).get();

    const workplaceElements = $(item).find("td:nth-child(1) > a");
    const workplaces = workplaceElements.map((_i, elem) => $(elem).text().trim()).get();

    // Extract the academic title and remove it from the original title
    const academicTitleMatch = title.match(/\((.*?)\)/);
    let academicTitle = academicTitleMatch ? academicTitleMatch[1] : "";

    title = title.replace(`(${academicTitle})`, "").trim();

    // Remove the parentheses and trim any extra whitespace from the academicTitle
    academicTitle = academicTitle.replace(/[\(\)]/g, "").trim();

    // Rearrange the name
    const nameParts = title.split(" ");
    const lastName = nameParts.shift();
    const firstName = nameParts.join(" ");
    const rearrangedName = `${lastName} ${firstName}`.replace(/\s+/g, " ");

    for (let i = 0; i < workplaces.length; i++) {
      const result: SearchResult = {
        title: rearrangedName,
        phones: [phones[i] || ""],
        emails: [emails[i] || ""],
        workplaces: [workplaces[i]],
        academicTitle: academicTitle,
      };

      results.push(result);
    }
  });

  return results;
}