import { useState, useEffect, useCallback, useRef } from "react";
import { ActionPanel, Action, Grid, List, Icon, useNavigation, showToast, Toast } from "@raycast/api";
import { load, CheerioAPI } from "cheerio";
import { Details } from "./detail";
import { DealEntry, SearchState } from "./types/types";
import { baseUrl, genreColors } from "./utils/constants";
import { fetchHtml } from "./utils/fetchHtml";

export default function Command() {
  const { state, search } = useSearch();
  const { push } = useNavigation();

  const [itemSize, setItemSize] = useState(8);
  const [isLoading, setIsLoading] = useState(true);

  const renderGridSection = (deals: DealEntry[]) => {
    return deals.slice(0, 8).map(({ gameName, imageUrl, price, url }, index) => (
      <Grid.Item
        key={index}
        content={{ value: { source: imageUrl }, tooltip: gameName }}
        title={gameName}
        subtitle={price}
        actions={
          <ActionPanel>
            <Action
              title="Show Details"
              icon={Icon.Sidebar}
              onAction={() => push(<Details url={baseUrl + url} name={gameName} />)}
            />
            <Action.OpenInBrowser url={baseUrl + url} />
          </ActionPanel>
        }
      />
    ));
  };

  const renderListDetail = (deals: DealEntry[]) => {
    const genreList = deals.map(({ genres }) => genres.split(",").map((genre) => genre.trim()));

    return deals.map(({ gameName, imageUrl, price, url, releaseDate, platforms }, index) => (
      <List.Item
        key={index}
        title={gameName}
        detail={
          <List.Item.Detail
            markdown={`![Illustration](${imageUrl})`}
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Price" text={price} />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Release Date" text={releaseDate} />
                <List.Item.Detail.Metadata.TagList title="Genres">
                  {genreList[index].map((genre, index) => (
                    <List.Item.Detail.Metadata.TagList.Item
                      key={index}
                      text={genre}
                      color={genreColors[genre] || "#eed535"}
                    />
                  ))}
                </List.Item.Detail.Metadata.TagList>
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.TagList title="Platforms">
                  {platforms.map((platform, index) => (
                    <List.Item.Detail.Metadata.TagList.Item
                      key={index}
                      text={""}
                      icon={{ source: "platform-icons/" + platform + ".svg" }}
                    />
                  ))}
                </List.Item.Detail.Metadata.TagList>
              </List.Item.Detail.Metadata>
            }
          />
        }
        actions={
          <ActionPanel>
            <Action
              title="Show Details"
              icon={Icon.Sidebar}
              onAction={() => push(<Details url={baseUrl + url} name={gameName} />)}
            />
            <Action.OpenInBrowser url={baseUrl + url} />
          </ActionPanel>
        }
      />
    ));
  };

  if (state.searchText) {
    return (
      <List
        searchText={state.searchText}
        filtering={false}
        isLoading={state.isLoading}
        onSearchTextChange={search}
        searchBarPlaceholder="What game are you searching for?"
        throttle
        isShowingDetail={state.results.length > 0 ? true : false}
      >
        {state.results.length > 0 ? (
          <List.Section title="Results" subtitle={state.results.length + ""}>
            {!isLoading && renderListDetail(Object.values(state.results))}
          </List.Section>
        ) : (
          <List.EmptyView
            icon={{ source: "logo-white.svg" }}
            title="No deals found!"
            description="Please visit the website instead"
          />
        )}
      </List>
    );
  } else {
    return (
      <Grid
        columns={itemSize}
        isLoading={isLoading}
        fit={Grid.Fit.Fill}
        inset={Grid.Inset.Zero}
        filtering={false}
        onSearchTextChange={search}
        searchBarPlaceholder="What game are you searching for?"
        searchBarAccessory={
          <Grid.Dropdown
            tooltip="Select Grid Size"
            storeValue
            onChange={(newValue) => {
              setItemSize(newValue === "8" ? 8 : 5);
              setIsLoading(false);
            }}
          >
            <Grid.Dropdown.Section title="Grid Size">
              <Grid.Dropdown.Item title="Medium Icons" value="5" />
              <Grid.Dropdown.Item title="Small Icons" value="8" />
            </Grid.Dropdown.Section>
          </Grid.Dropdown>
        }
      >
        {state.historicalLows && !state.bestDeals && !state.newDeals ? (
          <Grid.EmptyView
            icon={{ source: "logo-white.svg" }}
            title="No deals found!"
            description="Please visit the website instead"
          />
        ) : (
          <>
            <Grid.Section aspectRatio="3/2" title="Historical lows">
              {!isLoading && renderGridSection(Object.values(state.historicalLows))}
            </Grid.Section>

            <Grid.Section aspectRatio="3/2" title="Best deals">
              {!isLoading && renderGridSection(Object.values(state.bestDeals))}
            </Grid.Section>

            <Grid.Section aspectRatio="3/2" title="New deals">
              {!isLoading && renderGridSection(Object.values(state.newDeals))}
            </Grid.Section>
          </>
        )}
      </Grid>
    );
  }
}

function useSearch() {
  const [state, setState] = useState<SearchState>({
    results: [],
    newDeals: [],
    bestDeals: [],
    historicalLows: [],
    isLoading: true,
    searchText: "",
  });

  const searchIdRef = useRef(0);

  const search = useCallback(
    async function search(searchText: string) {
      const currentSearchId = ++searchIdRef.current;

      setState((oldState) => ({
        ...oldState,
        isLoading: true,
        searchText: searchText,
      }));

      try {
        const results = new Array<DealEntry>();
        const newDeals = new Array<DealEntry>();
        const bestDeals = new Array<DealEntry>();
        const historicalLows = new Array<DealEntry>();

        let searchUrl = baseUrl;

        if (searchText) {
          const encodedSearchText = encodeURIComponent(searchText);
          searchUrl = `${baseUrl}/games/?title=${encodedSearchText}`;
        }

        const html = await fetchHtml(searchUrl);
        const $ = load(html);

        if (currentSearchId !== searchIdRef.current) {
          // Ignore outdated results
          return;
        }

        if (searchText) {
          populateSearch($, "#games-list .game-item", results);
        } else {
          populateDeals($, "section[id=deals-presets] div[class*=mp-col]:nth-of-type(1) div.list > div", newDeals);
          populateDeals($, "section[id=deals-presets] div[class*=mp-col]:nth-of-type(2) div.list > div", bestDeals);
          populateDeals(
            $,
            "section[id=deals-presets] div[class*=mp-col]:nth-of-type(3) div.list > div",
            historicalLows
          );
        }

        setState((oldState) => ({
          ...oldState,
          results,
          newDeals,
          bestDeals,
          historicalLows,
          isLoading: false,
        }));
      } catch (error) {
        if (currentSearchId === searchIdRef.current) {
          setState((oldState) => ({
            ...oldState,
            isLoading: false,
          }));
          showToast({ style: Toast.Style.Failure, title: "Could not perform search", message: String(error) });
        }
      }
    },
    [setState]
  );

  useEffect(() => {
    search("");
  }, []);

  return {
    state: state,
    search: search,
  };
}

function populateSearch($: CheerioAPI, selector: string, deals: DealEntry[]) {
  $(selector).each(function () {
    const gameName: string = $(this).find(".game-info-title.title").text();
    const imageUrl: string = $(this).find("img")[0].attribs.src;
    const priceKeyshop: string = $(this).find(".shop-price-keyshops .numeric").text();
    const url = $(this).find("a").attr("href") ?? "";
    const releaseDate = $(this).find(".date-tag .value").text();
    const genres = $(this).find(".genres-tag .value").text();

    const priceWrap = $(this).find(".price-content");
    const price = priceWrap.find(".price-inner.numeric").text();
    const hl = priceWrap.find("span").hasClass("historical");
    const discount = priceWrap.find(".discount").text();

    const priceText = price === "Free" ? "Free" : discount + (hl ? " HL " : " ") + price;

    const platforms = $(this)
      .find(".platforms-tag .value .platform-link-icon svg")
      .map(function () {
        const svg = $(this).children("use").attr("href");
        return svg ? svg.split("#").pop() : "";
      })
      .toArray();

    deals.push(
      new DealEntry(gameName, imageUrl, priceText, priceKeyshop, url, releaseDate, genres, discount, platforms)
    );
  });
}

function populateDeals($: CheerioAPI, selector: string, deals: DealEntry[]) {
  $(selector).each(function () {
    const gameName = $(this).find(".title-line").text().trim();
    const url = $(this).find("a").attr("href") ?? "";

    const priceWrap = $(this).find(".price-wrap");
    const price = priceWrap.find(".price-inner.numeric").text();
    const hl = priceWrap.find("span").hasClass("historical");
    const discount = priceWrap.find(".discount").text();

    const priceText = price === "Free" ? "Free" : discount + (hl ? " HL " : " ") + price;

    let imageUrl = "";
    const srcsetAttribute = $(this).find(".main-image").find("img").attr("srcset");
    if (srcsetAttribute) {
      const sources = srcsetAttribute.split(",");
      const highestResolutionSource = sources.find((source) => source.includes("2x"));

      if (highestResolutionSource) {
        imageUrl = highestResolutionSource.split(" ")[0];
      }
    }

    if (!imageUrl) {
      imageUrl = $(this).find("img")[0].attribs.src;
    }

    deals.push(new DealEntry(gameName, imageUrl, priceText, "", url, "", "", discount, []));
  });
}
