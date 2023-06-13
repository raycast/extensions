import type { Region, Zone } from '@scaleway/sdk'

type Locality = NonNullable<Region | Zone>

export const isRegion = (locality: Locality): locality is Region => {
  if (locality.split('-').length === 2) {
    return true
  }

  return false
}

export const isZone = (locality: Locality): locality is Zone => {
  if (locality.toLowerCase().split('-').length === 3) {
    return true
  }

  return false
}

export const getIconFromLocality = (locality: Locality) =>
  `flags/${locality.split('-')[0] as string}.svg`
