import { Clipboard, showHUD } from '@raycast/api'
import { convertToTana } from './utils/tana-converter'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export default async function Command() {
  try {
    // Get clipboard content directly - no need to try selected text for quick clipboard command
    const clipboardText = await Clipboard.readText()

    if (!clipboardText) {
      await showHUD('Clipboard is empty')
      return
    }

    // Convert to Tana format
    const tanaOutput = convertToTana(clipboardText)

    // Copy back to clipboard
    await Clipboard.copy(tanaOutput)

    // Open Tana
    try {
      await execAsync('open tana://')
      await showHUD('Tana format copied to clipboard. Opening Tana... ✨')
    } catch (error) {
      console.error('Error opening Tana:', error)
      await showHUD("Tana format copied to clipboard (but couldn't open Tana) ✨")
    }
  } catch (error) {
    console.error('Error processing clipboard:', error)
    await showHUD('Failed to process clipboard content')
  }
}
