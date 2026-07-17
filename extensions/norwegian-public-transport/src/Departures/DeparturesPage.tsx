import { Color, Icon, List, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { Actions } from "./Actions";
import { Detail } from "./Detail";
import { fetchDepartures } from "../api";
import { DirectionType, Feature, QuayLineFavorites, StopPlaceQuayDeparturesQuery } from "../types";
import {
  filterFavoritesFromResponse,
  filterFavoritesOnStopPlace,
  formatAsClock,
  formatAsTimestamp,
  formatDestinationDisplay,
  formatDirection,
  getSubModeText,
  getTransportIcon,
  isFavoriteLine,
  sortEstimatedCallsByTime,
} from "../utils";
import { loadFavoriteLines } from "../storage";
import { Departure } from "../api/departuresQuery";

export default function DeparturesPage({ venue }: { venue: Feature }) {
  const [items, setItems] = useState<StopPlaceQuayDeparturesQuery>();
  const [isLoading, setIsLoading] = useState(true);
  const [numberOfDepartures, setNumberOfDepartures] = useState(5);
  const [showDetails, setShowDetails] = useState(false);
  const departures = items?.stopPlace;
  const favoriteDepartures = items?.favorites;

  const [storedFavoriteLines, setStoredFavoriteLines] = useState<QuayLineFavorites[]>();
  useEffect(() => {
    loadFavoriteLines().then((lines) => {
      setStoredFavoriteLines(lines ?? []);
    });
  }, []);

  useEffect(() => {
    const abortController = new AbortController();
    (async () => {
      if (!venue?.properties.id) return;
      if (storedFavoriteLines === undefined) return;
      const toast = showToast({
        title: "Loading departures...",
        style: Toast.Style.Animated,
      });

      const departures = await fetchDepartures(
        venue.properties.id,
        numberOfDepartures,
        filterFavoritesOnStopPlace(storedFavoriteLines, venue.properties.id),
        abortController.signal,
      );
      // Filter out favorite lines that are for the wrong quay, since we can't
      // filter with quay granularity in the query
      const departuresWithQuayFavorites = filterFavoritesFromResponse(
        departures,
        storedFavoriteLines ?? [],
      );

      setItems(departuresWithQuayFavorites);
      (await toast).hide();
      setIsLoading(false);
    })();
    return () => abortController.abort();
  }, [
    venue?.properties.id,
    numberOfDepartures,
    storedFavoriteLines?.flatMap((f) => [...f.lineIds]).length,
  ]);

  const departuresWithSortedQuays = departures?.quays?.sort((a, b) => {
    if (a.name + a.publicCode < b.name + b.publicCode) return -1;
    if (a.name + a.publicCode > b.name + b.publicCode) return 1;
    return 0;
  });

  if (isLoading) {
    return <List isLoading searchBarPlaceholder="Filter by line, mode of transport or authority" />;
  }

  return (
    <List
      searchBarPlaceholder="Filter by line, mode of transport or authority"
      navigationTitle={departures?.name}
      filtering={{ keepSectionOrder: true }}
      isShowingDetail={showDetails}
    >
      {!favoriteDepartures?.length && !departuresWithSortedQuays?.length && (
        <List.EmptyView description="Looks like there are no departures from this stop in the near future" />
      )}
      {favoriteDepartures && favoriteDepartures.length > 0 && (
        <List.Section title="Favorites">
          {favoriteDepartures
            .flatMap((favorite) => favorite.estimatedCalls)
            .sort(sortEstimatedCallsByTime)
            .slice(0, numberOfDepartures)
            .map((ec) => {
              return (
                <EstimatedCallItem
                  key={ec.serviceJourney.id + ec.aimedDepartureTime}
                  ec={ec}
                  loadMore={() => setNumberOfDepartures((n) => n + 5)}
                  setShowDetails={() => setShowDetails(!showDetails)}
                  isShowingDetails={showDetails}
                  venue={venue}
                  isFavorite={isFavoriteLine(
                    storedFavoriteLines ?? [],
                    ec.serviceJourney.line.id,
                    ec.quay.id,
                  )}
                  setFavorites={setStoredFavoriteLines}
                />
              );
            })}
        </List.Section>
      )}
      {departures &&
        departuresWithSortedQuays?.map((quay, i) => {
          return (
            <List.Section
              key={quay.id}
              title={getQuayTitle({
                index: i,
                quayName: quay.name,
                quayPublicCode: quay.publicCode,
              })}
              subtitle={getQuayDescription({
                directionTypes: quay.estimatedCalls.map((ec) => ec.serviceJourney.directionType),
                description: quay.description,
              })}
            >
              {quay.estimatedCalls.map((ec) => (
                <EstimatedCallItem
                  key={ec.serviceJourney.id + ec.aimedDepartureTime}
                  ec={ec}
                  loadMore={() => setNumberOfDepartures((n) => n + 5)}
                  setShowDetails={() => setShowDetails(!showDetails)}
                  isShowingDetails={showDetails}
                  venue={venue}
                  isFavorite={isFavoriteLine(
                    storedFavoriteLines ?? [],
                    ec.serviceJourney.line.id,
                    ec.quay.id,
                  )}
                  setFavorites={setStoredFavoriteLines}
                />
              ))}
            </List.Section>
          );
        })}
    </List>
  );
}

function EstimatedCallItem({
  ec,
  loadMore,
  setShowDetails,
  venue,
  isShowingDetails,
  isFavorite = false,
  setFavorites,
}: {
  ec: Departure;
  venue: Feature;
  setShowDetails: () => void;
  loadMore: () => void;
  isShowingDetails?: boolean;
  setFavorites: (favorites: QuayLineFavorites[]) => void;
  isFavorite?: boolean;
}) {
  const lineName = `${ec.serviceJourney.line.publicCode ?? ""} ${formatDestinationDisplay(
    ec.destinationDisplay,
  )}`;

  return (
    <List.Item
      accessories={[
        {
          tag: {
            value: new Date(ec.expectedDepartureTime ?? ec.aimedDepartureTime),
            color: ec.realtime
              ? ec.predictionInaccurate
                ? Color.Yellow
                : Color.Green
              : Color.SecondaryText,
          },
        },
        isFavorite
          ? {
              icon: {
                source: Icon.Star,
                tintColor: Color.Yellow,
              },
            }
          : {},
      ]}
      icon={getTransportIcon(
        ec.serviceJourney.line.transportMode,
        ec.serviceJourney.line.transportSubmode,
      )}
      actions={
        <Actions
          ec={ec}
          venue={venue}
          setShowDetails={setShowDetails}
          loadMore={loadMore}
          isFavorite={isFavorite}
          setFavorites={setFavorites}
        />
      }
      key={ec.serviceJourney.id + ec.aimedDepartureTime}
      title={lineName}
      subtitle={
        isShowingDetails
          ? undefined
          : {
              value: formatAsClock(ec.expectedDepartureTime ?? ec.aimedDepartureTime),
              tooltip: formatAsTimestamp(ec.expectedDepartureTime ?? ec.aimedDepartureTime),
            }
      }
      detail={<Detail ec={ec} />}
      keywords={[
        formatDestinationDisplay(ec.destinationDisplay) ?? "",
        ec.serviceJourney.line.description ?? "",
        ec.serviceJourney.line.publicCode ?? "",
        ec.serviceJourney.line.transportMode ?? "",
        getSubModeText(ec.serviceJourney.line.transportSubmode) ?? "",
        ec.serviceJourney.line.authority?.name ?? "",
      ]}
    />
  );
}

function getQuayTitle({
  index,
  quayName,
  quayPublicCode,
}: {
  index: number;
  quayName?: string;
  quayPublicCode?: string;
}): string {
  const name = quayName ?? `Quay ${index + 1}`;
  const publicCode = quayPublicCode ? ` ${quayPublicCode}` : "";

  return `${name}${publicCode}`;
}

function getQuayDescription({
  description,
  directionTypes,
}: {
  description?: string;
  directionTypes: DirectionType[];
}): string {
  const directions = new Set<DirectionType>(directionTypes);
  const commonDirection = directions.size === 1 ? Array.from(directions)[0] : undefined;
  const directionString =
    commonDirection && commonDirection !== "unknown" ? `(${formatDirection(commonDirection)})` : "";

  const descriptionString = description ? `${description} ` : "";

  return `${descriptionString}${directionString}`;
}
