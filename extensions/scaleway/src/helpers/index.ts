import { Region, Zone } from '@scaleway/sdk'

export function bytesToSize(bytes?: number) {
  if (bytes === undefined) return 'unknown'

  const sizes = ['Bytes', 'Ko', 'Mo', 'Go', 'To', 'Po']
  if (bytes == 0) return '0 Byte'
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1e3)).toString())
  return Math.round(bytes / Math.pow(1e3, i)) + ' ' + sizes[i]
}

export function capitalize(str: string) {
  return str[0].toUpperCase() + str.slice(1)
}

export function getCountryImage(region: Region | Zone) {
  return `flags/${region.toLowerCase().substring(0, 2)}.svg`
}
