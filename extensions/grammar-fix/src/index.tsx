import React, { useState, useEffect } from "react";
import {
  showHUD,
  Clipboard,
  Detail,
  ActionPanel,
  Action,
  popToRoot,
  closeMainWindow,
  getPreferenceValues,
} from "@raycast/api";
import OpenAI from "openai";

interface Preferences {
  apiKey: string;
}

export default function Command() {
  const [rewrittenText, setRewrittenText] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const { apiKey } = getPreferenceValues<Preferences>();

  if (!apiKey) {
    return <Detail markdown="**Error:** OpenAI API key is not set. Please update your preferences." />;
  }

  const openai = new OpenAI({
    apiKey: apiKey,
  });

  useEffect(() => {
    async function fetchAndRewriteText() {
      try {
        const clipboardContent = await Clipboard.readText();
        if (!clipboardContent) {
          await showHUD("Clipboard is empty");
          setLoading(false);
          return;
        }

        const prompt = `Please revise the following text for correct grammar, spelling, and style in British English: ${clipboardContent}`;

        const chatCompletion = await openai.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          model: "gpt-3.5-turbo",
        });

        const text = chatCompletion.choices[0]?.message?.content;

        if (text) {
          setRewrittenText(text);
        } else {
          await showHUD("Failed to get a valid response from OpenAI");
        }
      } catch (error) {
        console.error("Error:", error);
        await showHUD("Failed to rewrite text");
      } finally {
        setLoading(false);
      }
    }

    fetchAndRewriteText();
  }, []);

  if (loading) {
    return <Detail markdown="Loading..." />;
  }

  if (!rewrittenText) {
    return <Detail markdown="Failed to get rewritten text." />;
  }

  return (
    <Detail
      markdown={rewrittenText}
      actions={
        <ActionPanel>
          <Action
            title="Copy to Clipboard"
            onAction={async () => {
              await Clipboard.copy(rewrittenText);
              await showHUD("Grammar fixed text copied to clipboard");
              popToRoot();
              closeMainWindow();
            }}
          />
        </ActionPanel>
      }
    />
  );
}
