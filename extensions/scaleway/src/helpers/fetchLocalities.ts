import type { Region, Zone } from '@scaleway/sdk'

type RegionFetcher<T, R> = (request: R) => Promise<T[]>
type ZoneFetcher<T, R> = (request: R) => Promise<T[]>

/**
 * Executes a request for several zones at once.
 *
 * @param zones - The zones
 * @param fetcher - The fetcher
 * @param request - The request
 * @returns The resolved promise
 *
 * @internal
 */
export const fetchAllZones = async <T, R extends { zone?: Zone }>(
  zones: Zone[],
  fetcher: ZoneFetcher<T, R>,
  request: R
) => (await Promise.all(zones.map((zone) => fetcher({ ...request, zone })))).flat()

/**
 * Executes a request for several regions at once.
 *
 * @param regions - The regions
 * @param fetcher - The fetcher
 * @param request - The request
 * @returns The resolved promise
 *
 * @internal
 */
export const fetchAllRegions = async <T, R extends { region?: Region }>(
  regions: Region[],
  fetcher: RegionFetcher<T, R>,
  request: R
) => (await Promise.all(regions.map((region) => fetcher({ ...request, region })))).flat()
