import { Action, ActionPanel, Color, Icon, Image, List, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { searchMedias } from "./api";
import { Country, JustWatchMedia, JustWatchMediaOffers, MediaType } from "./types";
import crypto from "crypto";
import React from "react";

export default function SearchJustwatch() {
  const [medias, setMedias] = useState<JustWatchMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [countries, setCountries] = useState([]);

  useEffect(() => {
    LocalStorage.getItem<string>("country_code").then((countryCode) => {
      setCountryCode(countryCode || "en_CA");
    });
  }, [countryCode]);

  useEffect(() => {
    const _countries: any = Object.entries(Country);
    setCountries(_countries);
  }, []);

  const onSearch = async (search: string) => {
    setLoading(true);
    setSearchText(search);
    if (!search) {
      setLoading(false);
      setMedias([]);
      return;
    }

    searchMedias(search).then((medias) => {
      setMedias(medias);
      setLoading(false);
    });
  };

  const onCountryChange = async (locale: string) => {
    // first one is empty because otherwise it always instantly sets it to the first country
    // so that we can check and remove it
    if (countries[0][0] === "") {
      countries.shift();
      setCountries(countries);
    } else {
      LocalStorage.setItem("country_code", locale);
      setCountryCode(locale);

      onSearch(searchText);
    }
  };

  return (
    <>
      <List
        isLoading={loading}
        throttle={true}
        onSearchTextChange={onSearch}
        isShowingDetail={medias.length > 0 && searchText.length > 0}
        searchBarPlaceholder={"Search for a show or movie..."}
        searchBarAccessory={
          <List.Dropdown
            tooltip="Show availability in a different country"
            onChange={onCountryChange}
            defaultValue={countryCode}
          >
            {countries.map((object, id) => (
              <List.Dropdown.Item key={id} title={object[1]} value={object[0]} />
            ))}
          </List.Dropdown>
        }
      >
        {medias.length > 0 && searchText.length > 0 ? (
          medias.map((media) => (
            <List.Section key={media.id} title={`${media.name} (${media.year})`} subtitle={`${media.type}`}>
              {media.offers.length > 0 ? (
                media.offers.map((offer) => (
                  <List.Item
                    title={offer.name || "-"}
                    key={offer.url + offer.presentation_type + offer.price_amount + media.id}
                    icon={{ source: offer.icon, mask: Image.Mask.RoundedRectangle }}
                    accessories={[
                      offer.type == MediaType.free
                        ? {
                            tag: {
                              value: offer.type_parsed,
                              color: getColor(offer.type),
                            },
                          }
                        : {},

                      media.is_movie && (offer.type == MediaType.buy || offer.type == MediaType.rent)
                        ? {
                            tag: {
                              value:
                                getParsedCurrency(offer.price_amount, offer.currency) + ` (${offer.presentation_type})`,
                              color: getColor(offer.type),
                            },
                          }
                        : !media.is_movie
                        ? {
                            tag: {
                              value: `${offer.seasons}`,
                              color: getColor(offer.type),
                            },
                          }
                        : {},
                    ]}
                    detail={<Detail media={media} offer={offer} />}
                    actions={<Actions media={media} offer={offer} />}
                  />
                ))
              ) : (
                <List.Item
                  title={``}
                  subtitle={"No available options"}
                  key={`${media.id}-no-options`}
                  icon={{ source: Icon.Monitor, mask: Image.Mask.RoundedRectangle, tintColor: Color.SecondaryText }}
                  detail={<DetailNoOffers media={media} />}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser url={media.jw_url} title={`Open in JustWatch.com`} />
                    </ActionPanel>
                  }
                />
              )}
            </List.Section>
          ))
        ) : (
          <List.EmptyView
            icon={{ source: searchText && !loading ? Icon.MagnifyingGlass : "command-icon.png" }}
            title={searchText && !loading ? "No Results Found" : "Enter a Movie or Show Name"}
            description={
              searchText && !loading
                ? "We couldn't find that movie or show"
                : "Search for a movie or show to see where it's available to watch"
            }
          />
        )}
      </List>
    </>
  );

  function Detail(props: { media: JustWatchMedia; offer: JustWatchMediaOffers }) {
    return (
      <List.Item.Detail
        markdown={`<img height="185" src="${props.media.thumbnail}" />`}
        metadata={
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title={"Title"} text={`${props.media.name} (${props.media.year})`} />
            {props.offer.type == MediaType.stream ? (
              <List.Item.Detail.Metadata.TagList title="Available for">
                <List.Item.Detail.Metadata.TagList.Item
                  text={props.offer.type_parsed}
                  color={getColor(props.offer.type)}
                  icon={{ source: props.offer.icon, mask: Image.Mask.RoundedRectangle }}
                />
                <List.Item.Detail.Metadata.TagList.Item text={props.offer.presentation_type} color={Color.Red} />
              </List.Item.Detail.Metadata.TagList>
            ) : (
              <></>
            )}

            {props.offer.type == MediaType.buy || props.offer.type == MediaType.rent ? (
              <>
                <List.Item.Detail.Metadata.TagList title="Price">
                  <List.Item.Detail.Metadata.TagList.Item
                    text={
                      `${props.offer.type_parsed} for ` +
                      getParsedCurrency(props.offer.price_amount, props.offer.currency) +
                      ` (${props.offer.presentation_type})`
                    }
                    color={getColor(props.offer.type)}
                    icon={{ source: props.offer.icon, mask: Image.Mask.RoundedRectangle }}
                  />
                </List.Item.Detail.Metadata.TagList>

                {props.offer.other_prices && props.offer.other_prices.length > 0 ? (
                  <List.Item.Detail.Metadata.TagList title={"Other Prices"}>
                    {props.offer.other_prices.map((other_price) => (
                      <React.Fragment
                        key={`${props.offer.name}-${other_price.presentation_type}-${other_price.currency}-${other_price.price_amount}-${props.media.id}`}
                      >
                        <List.Item.Detail.Metadata.TagList.Item
                          text={
                            getParsedCurrency(other_price.price_amount, other_price.currency) +
                            ` (${other_price.presentation_type})`
                          }
                          color={Color.SecondaryText}
                          icon={{ source: props.offer.icon, mask: Image.Mask.RoundedRectangle }}
                        />
                      </React.Fragment>
                    ))}
                  </List.Item.Detail.Metadata.TagList>
                ) : (
                  <></>
                )}
              </>
            ) : (
              <></>
            )}

            {props.offer.type == MediaType.free ? (
              <List.Item.Detail.Metadata.TagList title="Price">
                <List.Item.Detail.Metadata.TagList.Item
                  text={"FREE"}
                  color={getColor(props.offer.type)}
                  icon={{ source: props.offer.icon, mask: Image.Mask.RoundedRectangle }}
                />
              </List.Item.Detail.Metadata.TagList>
            ) : (
              <></>
            )}

            {!props.media.is_movie ? (
              <List.Item.Detail.Metadata.Label title={""} text={props.offer.seasons}></List.Item.Detail.Metadata.Label>
            ) : (
              <></>
            )}

            <List.Item.Detail.Metadata.Link
              title={"Platform"}
              text={props.offer.name}
              target={props.offer.url}
            ></List.Item.Detail.Metadata.Link>

            <List.Item.Detail.Metadata.Separator />

            <List.Item.Detail.Metadata.Label
              text={getImdbRating(props.media)}
              title={"Rating"}
              icon={"imdb.png"}
            ></List.Item.Detail.Metadata.Label>

            <List.Item.Detail.Metadata.Separator />

            <List.Item.Detail.Metadata.Link
              title={""}
              text={"View on JustWatch.com"}
              target={props.media.jw_url}
            ></List.Item.Detail.Metadata.Link>
          </List.Item.Detail.Metadata>
        }
      />
    );
  }

  function DetailNoOffers(props: { media: JustWatchMedia }) {
    return (
      <List.Item.Detail
        markdown={`
# ${props.media.name} (${props.media.year})
<img src="${props.media.thumbnail}" height="180"/>
This is not available to watch on any of the services you selected. 
Try changing the country or updating your selection of services in preferences.
`}
      />
    );
  }

  function Actions(props: { media: JustWatchMedia; offer: JustWatchMediaOffers }) {
    return (
      <ActionPanel>
        <Action.OpenInBrowser url={props.offer.url} title={`Open in Browser`} />
        <Action.OpenInBrowser url={props.media.jw_url} title={`Open in JustWatch.com`} />
        <Action.CopyToClipboard
          shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
          content={props.offer.url}
          title={"Copy URL to Clipboard"}
        />
      </ActionPanel>
    );
  }

  function getParsedCurrency(amount: number, currency: string) {
    const formatter = new Intl.NumberFormat(countryCode.replace("_", "-"), {
      style: "currency",
      currency: currency,
    });

    return formatter.format(amount);
  }

  function getImdbRating(media: JustWatchMedia) {
    let rating, votes;
    if (media.imdb_score) {
      rating = `${media.imdb_score.toString()}★`;
    }
    if (media.imdb_votes) {
      votes = `${media.imdb_votes.toLocaleString(countryCode.replace("_", "-"))} votes`;
    }

    if (rating && votes) {
      return `${rating} ⸱ ${votes}`;
    }

    if (rating) {
      return `${rating}`;
    }

    if (votes) {
      return `${votes}`;
    }

    return "N/A";
  }

  function getColor(type: string) {
    switch (type) {
      case MediaType.buy:
        return Color.Blue;
      case MediaType.rent:
        return Color.Purple;
      case MediaType.stream:
        return Color.Green;
      case MediaType.free:
        return Color.Magenta;
      // return "#1956EF";
      default:
        return Color.SecondaryText;
    }
  }
}
