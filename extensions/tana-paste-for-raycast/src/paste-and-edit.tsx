import React, { useState, useEffect } from 'react'
import { Form, ActionPanel, Action, showHUD, Clipboard } from '@raycast/api'
import { convertToTana } from './utils/tana-converter'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

interface FormValues {
  text: string
}

export default function Command() {
  const [text, setText] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  /**
   * On mount, try to get clipboard content
   */
  useEffect(() => {
    const initializeText = async () => {
      try {
        const clipboardText = await Clipboard.readText()
        if (clipboardText) {
          setText(clipboardText)
        }
      } catch (error) {
        console.error('Error reading clipboard:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeText()
  }, [])

  /**
   * Initializes the form with clipboard content
   */
  const loadClipboardContent = async () => {
    try {
      setIsLoading(true)
      const clipboardText = await Clipboard.readText()
      if (clipboardText) {
        setText(clipboardText)
      }
    } catch (error) {
      console.error('Error reading clipboard:', error)
      await showHUD('Could not load clipboard content')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Handles the form submission
   */
  const handleSubmit = async (values: FormValues) => {
    try {
      if (!values.text.trim()) {
        await showHUD('Please enter some text')
        return
      }

      // Convert to Tana format
      const tanaOutput = convertToTana(values.text)

      // Copy to clipboard
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
      console.error('Error converting text:', error)
      await showHUD('Failed to convert text. Please try again.')
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.SubmitForm title="Convert and Open in Tana" onSubmit={handleSubmit} />
            <Action
              title="Load Clipboard Content"
              shortcut={{ modifiers: ['cmd'], key: 'l' }}
              onAction={loadClipboardContent}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="Text to Convert"
        placeholder="Paste or type your text here..."
        value={text}
        onChange={setText}
        enableMarkdown={false}
      />
    </Form>
  )
}
