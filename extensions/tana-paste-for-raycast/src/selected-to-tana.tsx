import { showHUD, getSelectedText, Clipboard } from '@raycast/api'
import { convertToTana } from './utils/tana-converter'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export default async function Command() {
  try {
    // Get selected text
    let selectedText: string | undefined

    try {
      selectedText = await getSelectedText()
    } catch (error) {
      console.error('Error getting selected text:', error)
      await showHUD('Unable to get selected text. Please ensure text is selected and try again.')
      return
    }

    if (!selectedText) {
      await showHUD('No text is currently selected. Please select some text and try again.')
      return
    }

    // Convert to Tana format
    const tanaOutput = convertToTana(selectedText)

    // Copy to clipboard
    await Clipboard.copy(tanaOutput)

    // Open Tana
    try {
      await execAsync('open tana://')
      await showHUD('Selected text converted and copied. Opening Tana... ✨')
    } catch (error) {
      console.error('Error opening Tana:', error)
      await showHUD("Selected text converted and copied (but couldn't open Tana) ✨")
    }
  } catch (error) {
    console.error('Error processing text:', error)
    await showHUD('Failed to process selected text. Please try selecting the text again.')
  }
}
