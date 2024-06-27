import { Clipboard, closeMainWindow, showHUD } from '@raycast/api'
import { screenshot } from './screenshot'
import { recognizeText } from './ocr'

export default async function Command() {

  await closeMainWindow()

  try {
    const image = await screenshot()
    if (!image) {
      return await showHUD('❌ No Image detected!')
    }

    const { file } = await Clipboard.read()

    let filepath = file
    if (file.substring(0, 7) === 'file://') { filepath = file.substring(7, file.length) }

    const ocrResult = await recognizeText(filepath)

    // console.log(`result = ${ocrResult}`)

    await Clipboard.copy(ocrResult)
    await closeMainWindow()

    return await showHUD('✅ Copied to clipboard')
  }
  catch (e) {
    console.error(e)
    await showHUD('❌ Failed to detect text')
  }
}
