import { Clipboard, getSelectedText, showHUD } from '@raycast/api'
import '@groqfmt/wasm/dist/wasm-exec.js'
import { format } from '@groqfmt/wasm'
import loadGroqfmt from './lib/load-groqfmt'

const Command = async () => {
  const groqfmt = await loadGroqfmt()
  let input = ''

  // Raycast will prompt the user to grant access when attempting to use the
  // clipboard, but not when accessing selected text.
  try {
    input = await getSelectedText()
  } catch {
    await showHUD('Unable to read selected text')
    return
  }

  const result = format({
    input: input ?? '',
    groqfmt,
  })

  if (typeof result?.error !== 'undefined') {
    await showHUD(`Error: ${result.error.message}`)
    return
  }

  await Clipboard.paste(result.result ?? input ?? '')
  await showHUD('Formatted GROQ')
}

export default Command
