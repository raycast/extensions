import { getObs } from './lib/obs'
import { showHUD }  from '@raycast/api'

export default async function main () {
  const obs = await getObs()

  // TODO: read this from preference
  await obs.connect("ws://localhost:4455");

  const { outputActive } = await obs.call('ToggleStream')

  if (outputActive) {
    showHUD('Streaming')
  } else {
    showHUD('Streaming stopped')
  }
}
