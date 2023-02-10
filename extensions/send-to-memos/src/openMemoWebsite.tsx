import { getPreferenceValues, open } from '@raycast/api'
import { Preferences } from './types/global'
import parse from 'url-parse'

export default async function Main() {
  const preferences = getPreferenceValues<Preferences>()
  const { openApi } = preferences

  const { protocol, host } = parse(openApi)
  const url = `${protocol}//${host}`
  open(url)
}
