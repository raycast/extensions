import { Action, ActionPanel, Color, Detail, showToast, Toast } from "@raycast/api";
import { Key, useCallback, useEffect, useState } from "react";
import { load } from "cheerio";
import { DetailsProps, DetailsState, DetailEntry } from "./types/types";
import { editionColors, baseUrl } from "./utils/constants";
import { fetchHtml } from "./utils/fetchHtml";

export function Details(props: DetailsProps) {
  const { url, name } = props;

  const [state, setState] = useState<DetailsState>({ result: null, isLoading: true });

  const getDetails = useCallback(async function () {
    try {
      const html = await fetchHtml(url);
      const result = parseDetails(html);

      setState((oldState) => ({
        ...oldState,
        result, // Update the result with the parsed data
        isLoading: false,
      }));
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Error building detail page", message: String(error) });
    }
  }, []);

  const getMarkdown = useCallback(() => {
    if (state.isLoading) {
      return "";
    }

    if (state.result === null) {
      return "This game cannot be found...";
    }

    const { result } = state;

    const byPriceTable = state.result?.pricesByPriceLabels
      ?.map(([type, price, shop]: [string, string, string]) => `| ${type} | ${price} | ${shop} |`)
      .join("\n");
    const byTimeTable = state.result?.pricesByTimeLabels
      ?.map(([type, price, shop]: [string, string, string]) => `| ${type} | ${price} | ${shop} |`)
      .join("\n");

    return `
[<img src="${result.imageUrl}" width="180"/>](${result.imageUrl})
## ${result.gameName.replace("Buy ", "")}
| By price       |        |            |
|----------------|--------|------------|
${byPriceTable}

| By time       |        |            |
|---------------|--------|------------|
${byTimeTable}
`;
  }, [state]);

  useEffect(() => {
    getDetails();
  }, []);

  const priceOfficial = state.result?.priceOfficial || "0";
  const priceKeyshops = state.result?.priceKeyshops || "";

  const officialPriceColor = priceKeyshops ? (priceOfficial < priceKeyshops ? Color.Green : Color.Blue) : Color.Green;
  const keyshopPriceColor = priceOfficial < priceKeyshops ? Color.Blue : Color.Green;

  const metadata = !state.isLoading ? (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Official Stores" text={{ value: priceOfficial, color: officialPriceColor }} />
      <Detail.Metadata.Label title="Keyshops" text={{ value: priceKeyshops, color: keyshopPriceColor }} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.TagList title="Editions">
        {state.result?.editions.length === 0 ? (
          <Detail.Metadata.TagList.Item text="Standard" />
        ) : (
          state.result?.editions.map((edition: string, index: Key | null | undefined) => (
            <Detail.Metadata.TagList.Item key={index} text={edition} color={editionColors[edition] || ""} />
          ))
        )}
      </Detail.Metadata.TagList>
      <Detail.Metadata.TagList title="Platforms">
        {state.result?.platforms.map((platform, index) => (
          <Detail.Metadata.TagList.Item
            key={index}
            text={""}
            icon={{ source: "platform-icons/" + platform + ".svg" }}
          />
        ))}
      </Detail.Metadata.TagList>
      <Detail.Metadata.Separator />
      {state.result?.linkWidget && (
        <Detail.Metadata.Link title="External links" target={state.result.linkWidget} text="View on steam" />
      )}
    </Detail.Metadata>
  ) : null;

  return (
    <Detail
      isLoading={state.isLoading}
      navigationTitle={name}
      markdown={getMarkdown()}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" url={url} />
          <Action.CopyToClipboard title="Copy URL" content={url} />
        </ActionPanel>
      }
      metadata={metadata}
    />
  );
}

function parseDetails(html: string): DetailEntry {
  const $ = load(html);
  const pricesByPriceLabels: [string, string, string][] = [];
  const pricesByTimeLabels: [string, string, string][] = [];

  const gameName = $("h1").text();
  const imageUrl = $(".game-info-image").find("img")[0].attribs.src;
  let linkWidget = $(".game-link-widget").attr("href") ?? "";

  if (linkWidget) {
    const url = new URL(linkWidget);
    linkWidget = baseUrl + url.pathname;
  }

  const priceOfficial = $("#game-header-current-prices a[href='#official-stores']").find(".numeric").text();
  const priceKeyshops = $("#game-header-current-prices a[href='#keyshops']").find(".numeric").text();
  const priceBox = $("#game-lowest-tab-price > div");
  const priceTimeBox = $("#game-lowest-tab-time > div");

  priceBox.each(function () {
    const type = $(this).find(".price-type").text();
    const shop = $(this).find(".shop-name").text();
    const price = $(this).find(".numeric").text();

    pricesByPriceLabels.push([type, shop, price]);
  });

  priceTimeBox.each(function () {
    const type = $(this).find(".price-type").text();
    const shop = $(this).find(".shop-name").text();
    const price = $(this).find(".numeric").text();

    pricesByTimeLabels.push([type, shop, price]);
  });

  const editions = $(".game-editions-list .badges-container")
    .children()
    .map((index, element) => $(element).text())
    .get();

  const platforms = $(".game-header-container .menu-item svg")
    .map(function () {
      const svg = $(this).children("use").attr("href");
      return svg ? svg.split("#").pop() : "";
    })
    .toArray();

  return new DetailEntry(
    gameName,
    imageUrl,
    linkWidget,
    priceOfficial,
    priceKeyshops,
    pricesByPriceLabels,
    pricesByTimeLabels,
    editions,
    platforms
  );
}
