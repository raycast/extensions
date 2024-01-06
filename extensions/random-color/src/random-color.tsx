import { randomColor } from './utils'
import { closeMainWindow, Clipboard, showHUD, getPreferenceValues } from '@raycast/api'

export const produceOutput = async (content: string) => {
  const { action: preference = 'clipboard' } = getPreferenceValues()

  switch (preference) {
    case 'clipboard':
      await Clipboard.copy(content)
      showHUD(`Copied ${content} to clipboard!`)
      break

    case 'paste':
      await Clipboard.paste(content)
      showHUD(`Pasted ${content} to active app!`)
      break
  }

  await closeMainWindow()
}

export default async function Command() {
  const output = randomColor()
  await produceOutput(output)
}
