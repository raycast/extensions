import { Action, ActionPanel, Icon, Image, List, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { searchMedias } from "./api";
import { Country, JustWatchMedia, JustWatchMediaOffers, MediaType } from "./types";

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
    }

    LocalStorage.setItem("country_code", locale);

    onSearch(searchText);
  };

  return (
    <>
      <List
        isLoading={loading}
        throttle={true}
        onSearchTextChange={onSearch}
        isShowingDetail={true}
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
        {medias.map((media) => (
          <List.Section key={media.id} title={`${media.name} (${media.year})`} subtitle={`${media.type}`}>
            {media.offers.length > 0 ? (
              media.offers.map((offer) => (
                <List.Item
                  title={offer.name || "-"}
                  key={offer.url}
                  icon={{ source: offer.icon, mask: Image.Mask.RoundedRectangle }}
                  accessoryTitle={`${offer.price_amount ? "($$)" : ""} ${offer.seasons}`}
                  detail={<Detail media={media} offer={offer} />}
                  actions={<Actions media={media} offer={offer} />}
                />
              ))
            ) : (
              <List.Item
                title={``}
                subtitle={"No available options"}
                key={`${media.id}-no-options`}
                icon={{ source: Icon.ExclamationMark, mask: Image.Mask.RoundedRectangle }}
                detail={<DetailNoOffers media={media} />}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser url={media.jw_url} title={`Open in JustWatch.com`} />
                  </ActionPanel>
                }
              />
            )}
          </List.Section>
        ))}
      </List>
    </>
  );

  function Detail(props: { media: JustWatchMedia; offer: JustWatchMediaOffers }) {
    return (
      <List.Item.Detail
        markdown={`
# ${props.media.name} (${props.media.year})

<img src="${props.media.thumbnail}" height="280"/>

Available for **${getMediaType(props.offer.price_amount, props.offer.price, props.offer.type)}** on [${
          props.offer.name
        }](${props.offer.url})
`}
      />
    );
  }

  function DetailNoOffers(props: { media: JustWatchMedia }) {
    return (
      <List.Item.Detail
        markdown={`
# ${props.media.name} (${props.media.year})

<img src="${props.media.thumbnail}" height="220"/>

This is not available to watch at any of the services you selected. 

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

  function getMediaType(amount: number, price: string, type: string) {
    if (amount) {
      if (type === MediaType.buy) {
        return `Purchase (${price})`;
      } else if (type === MediaType.rent) {
        return `Rent (${price})`;
      }
    }

    if (type == MediaType.stream) {
      return "Streaming";
    }

    if (type == MediaType.free) {
      return "Free";
    }
  }
}
