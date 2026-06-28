import React from "react";
import { Action, ActionPanel, Detail, Icon, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { useEffect, useState } from "react";
import { TextToSpeechProcessor } from "./processors/text-to-speech-processor";

const Command = () => {
  const [script, setScript] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const preferences = getPreferenceValues<Preferences>();

  const processor = new TextToSpeechProcessor(preferences, (generatedScript: string) => fetchScript(generatedScript));

  const fetchScript = async (generatedScript: string) => {
    setScript(generatedScript);
    setIsLoading(false);
  };

  useEffect(() => {
    processor.processSelectedText();
  }, []);

  return (
    <Detail
      actions={
        script && (
          <ActionPanel title="Content Actions">
            <Action.CopyToClipboard title="Copy Script" content={script} />
            <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
            <Action.OpenInBrowser
              icon={"coffee.svg"}
              title="Buy Me A Coffee"
              url="https://www.buymeacoffee.com/lucas.ghae"
            />
            <Action.OpenInBrowser icon={"twitter_logo_white.svg"} title="DM On X" url="https://x.com/lucas_ghae" />
          </ActionPanel>
        )
      }
      isLoading={isLoading}
      markdown={script || ""}
      // metadata={
      //   script && (
      //     <Detail.Metadata>
      //       {/* WIP: Work in progress */}
      //       <Detail.Metadata.Separator />
      //       <Detail.Metadata.Label
      //         title="Disclaimer"
      //         text={
      //           "Please note that using Read AI for Raycast with lengthy texts may result in the consumption of a significant number of tokens, which could lead to higher costs associated with your OpenAI API usage. It is recommended to monitor your usage to avoid unexpected charges."
      //         }
      //       />
      //     </Detail.Metadata>
      //   )
      // }
    />
  );
};

export default Command;
