import React, { useState, useEffect } from "react";
import {
  Form,
  ActionPanel,
  Action,
  showHUD,
  Clipboard,
  getPreferenceValues,
} from "@raycast/api";
import { formatForTana } from "./utils/tana-formatter";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Form values for the paste and edit interface
 * @interface FormValues
 * @property {string} text - The text content to be converted to Tana format
 */
interface FormValues {
  text: string;
}

/**
 * Raycast command that provides a form interface for editing and converting text to Tana format
 * Loads clipboard content by default, allows user editing, converts to Tana format,
 * and opens the Tana application with the converted content
 */
export default function Command() {
  const [text, setText] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const preferences = getPreferenceValues<Preferences>();

  /**
   * On mount, try to get clipboard content and convert it to Tana format
   */
  useEffect(() => {
    const initializeText = async () => {
      try {
        const clipboardText = await Clipboard.readText();
        if (clipboardText) {
          // Convert to Tana format immediately for editing
          const noteTag = preferences.noteTag;
          const tanaFormat = formatForTana({
            content: clipboardText,
            noteTag,
            urlField: preferences.urlField,
            authorField: preferences.authorField,
            transcriptField: preferences.transcriptField,
            contentField: preferences.contentField,
            includeAuthor: preferences.includeAuthor,
            includeDescription: preferences.includeDescription,
          });
          setText(tanaFormat);
        }
      } catch (error) {
        console.error("Error reading clipboard:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeText();
  }, []);

  /**
   * Loads clipboard content and converts it to Tana format
   */
  const loadClipboardContent = async () => {
    try {
      setIsLoading(true);
      const clipboardText = await Clipboard.readText();
      if (clipboardText) {
        // Convert to Tana format for editing
        const noteTag = preferences.noteTag;
        const tanaFormat = formatForTana({
          content: clipboardText,
          noteTag,
          urlField: preferences.urlField,
          authorField: preferences.authorField,
          transcriptField: preferences.transcriptField,
          contentField: preferences.contentField,
          includeAuthor: preferences.includeAuthor,
          includeDescription: preferences.includeDescription,
        });
        setText(tanaFormat);
      }
    } catch (error) {
      console.error("Error reading clipboard:", error);
      await showHUD("Could not load clipboard content");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles the form submission - text is already in Tana format
   */
  const handleSubmit = async (values: FormValues) => {
    try {
      if (!values.text.trim()) {
        await showHUD("Please enter some text");
        return;
      }

      // Text is already in Tana format from the form editing, just copy it
      await Clipboard.copy(values.text);

      // Open Tana
      try {
        await execAsync("open tana://");
        await showHUD("Tana format copied to clipboard. Opening Tana... ✨");
      } catch (error) {
        console.error("Error opening Tana:", error);
        await showHUD(
          "Tana format copied to clipboard (but couldn't open Tana) ✨",
        );
      }
    } catch (error) {
      console.error("Error processing text:", error);
      await showHUD("Failed to process text. Please try again.");
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.SubmitForm
              title="Convert and Open in Tana"
              onSubmit={handleSubmit}
            />
            <Action
              title="Load Clipboard Content"
              onAction={loadClipboardContent}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="Tana Format (Edit as needed)"
        placeholder="Tana formatted content will appear here for editing..."
        value={text}
        onChange={setText}
        enableMarkdown={false}
      />
    </Form>
  );
}
