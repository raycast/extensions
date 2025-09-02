import { showHUD, open } from '@raycast/api'
import { getRecordPanelDeepLink } from './utils/deepLink'

export default async function main() {
  const url = getRecordPanelDeepLink()
  await open(url)
  await showHUD('Opening Circleback recorder')
}
