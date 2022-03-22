import { Action, ActionPanel, Image, List, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { searchMedias } from "./api";
import { Country, JustWatchMedia, JustWatchMediaOffers } from "./types";

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
            {media.offers.map((offer) => (
              <List.Item
                title={offer.name || "-"}
                key={offer.url}
                icon={{ source: offer.icon, mask: Image.Mask.RoundedRectangle }}
                accessoryTitle={`${offer.price_amount ? "($$)" : ""} ${offer.seasons}`}
                detail={<Detail media={media} offer={offer} />}
                actions={<Actions media={media} offer={offer} />}
              />
            ))}
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
Available for **${props.offer.price_amount ? props.offer.price : "Streaming"}**

![Illustration](${props.media.thumbnail})

> **URL:** [${props.offer.url}](${props.offer.url})
`}
      />
    );
  }

  function Actions(props: { media: JustWatchMedia; offer: JustWatchMediaOffers }) {
    return (
      <ActionPanel>
        <Action.OpenInBrowser url={props.offer.url} title={`Open in Browser`} />
        <Action.CopyToClipboard content={props.offer.url} title={"Copy URL to Clipboard"} />
      </ActionPanel>
    );
  }
}
