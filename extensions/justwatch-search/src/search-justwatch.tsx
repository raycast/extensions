/* eslint-disable @raycast/prefer-title-case */
import { useState } from "react";
import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import { MediaType } from "@/types";
import { useSearchMedias } from "@/hooks/useApi";
import { useCountries } from "@/hooks/useCountries";
import { Actions } from "@/components/Actions";
import { Detail } from "@/components/Detail";
import { DetailNoOffers } from "@/components/DetailNoOffers";
import { getColor, getParsedCurrency } from "@/utils";

export default function SearchJustwatch() {
  const [searchText, setSearchText] = useState("");
  const { countries, countryCode, onCountryChange } = useCountries();
  const { data: medias, isLoading } = useSearchMedias(searchText, countryCode, countryCode !== null);

  return (
    <List
      isLoading={isLoading}
      throttle={true}
      onSearchTextChange={setSearchText}
      isShowingDetail={medias.length > 0 && searchText.length > 0}
      searchBarPlaceholder={"Search for a show or movie..."}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Show availability in a different country"
          onChange={onCountryChange}
          defaultValue={countryCode || ""}
        >
          {countries.map((object, id) => (
            <List.Dropdown.Item key={id} title={object[1]} value={object[0]} />
          ))}
        </List.Dropdown>
      }
    >
      {medias.length > 0 && searchText.length > 0 ? (
        medias.map((media) => (
          <List.Section key={media.id} title={`${media.name} (${media.year})`} subtitle={`${media.type.toLowerCase()}`}>
            {media.offers.length > 0 ? (
              media.offers.map((offer) => (
                <List.Item
                  title={offer.name || "-"}
                  key={offer.url + offer.presentationType + offer.priceAmount + media.id}
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

                    media.isMovie && (offer.type == MediaType.buy || offer.type == MediaType.rent)
                      ? {
                          tag: {
                            value:
                              getParsedCurrency(offer.priceAmount, offer.currency, countryCode) +
                              ` (${offer.presentationType})`,
                            color: getColor(offer.type),
                          },
                        }
                      : !media.isMovie
                        ? {
                            tag: {
                              value: `${offer.seasons}`,
                              color: getColor(offer.type),
                            },
                          }
                        : {},
                  ]}
                  detail={<Detail media={media} offer={offer} countryCode={countryCode} />}
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
                    <Action.OpenInBrowser icon="command-icon.png" url={media.jwUrl} title={`Open in JustWatch.com`} />
                    <Action.OpenInBrowser icon="imdb.png" url={media.imdbUrl} title={`Open in IMDB`} />
                  </ActionPanel>
                }
              />
            )}
          </List.Section>
        ))
      ) : (
        <List.EmptyView
          icon={{
            source:
              countryCode === null
                ? Icon.Warning
                : searchText && !isLoading
                  ? Icon.MagnifyingGlass
                  : "command-icon.png",
          }}
          title={
            countryCode === null
              ? "First select a country"
              : searchText && !isLoading
                ? "No Results Found"
                : "Enter a Movie or Show Name"
          }
          description={
            countryCode === null
              ? "If you want to search for a movie or show, first select a country from the dropdown above"
              : searchText && !isLoading
                ? "We couldn't find that movie or show"
                : "Search for a movie or show to see where it's available to watch"
          }
        />
      )}
    </List>
  );
}
