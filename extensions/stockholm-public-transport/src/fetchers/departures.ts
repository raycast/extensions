import { TransportMode } from "../types/TransportMode";
import { Site as SiteType } from "../types/Site";
import { Departure } from "../types/Departure";
import { useFetch } from "@raycast/utils";

const getSiteUrl = (site: SiteType, transport: TransportMode) =>
  `https://transport.integration.sl.se/v1/sites/${site.id}/departures?transport=${transport}`;

export const useTransport = (site: SiteType, mode: TransportMode) => {
  const { isLoading, data, revalidate } = useFetch<{ departures: Departure[] }>(getSiteUrl(site, mode));

  return { isLoading, data, revalidate };
};

export const useMetro = (site: SiteType) => useTransport(site, TransportMode.Metro);
export const useBus = (site: SiteType) => useTransport(site, TransportMode.Bus);
export const useFerry = (site: SiteType) => useTransport(site, TransportMode.Ferry);
export const useTrain = (site: SiteType) => useTransport(site, TransportMode.Train);
export const useShip = (site: SiteType) => useTransport(site, TransportMode.Ship);
export const useTram = (site: SiteType) => useTransport(site, TransportMode.Tram);
