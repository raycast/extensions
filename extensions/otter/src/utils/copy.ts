import { runAppleScript } from 'run-applescript'

export const copy = async () => {
  const clipboard = await runAppleScript('the clipboard')
  if (!clipboard || clipboard.length === 0) {
    throw 'Clipboard is empty'
  }
  return clipboard
}
