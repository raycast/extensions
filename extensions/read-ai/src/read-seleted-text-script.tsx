import React, { useEffect, useState } from "react";
import { Action, ActionPanel, Detail, getPreferenceValues, Icon, openExtensionPreferences } from "@raycast/api";
import { useScript, ScriptProvider } from "./contexts/script-context";
import { TextToSpeechProcessor } from "./processors/text-to-speech-processor";

const ReadWithScript = () => {
  const { script, setScript } = useScript();
  const [isLoading, setIsLoading] = useState(true);

  const preferences = getPreferenceValues<Preferences>();
  const processor = new TextToSpeechProcessor(
    preferences.apiKey,
    preferences.defaultVoice,
    preferences.temperature,
    preferences.gptModel,
    preferences.subtitlesToggle,
    preferences.outputLanguage,
    preferences.readingStyle,
    true,
  );

  useEffect(() => {
    // Set the loading state to true before starting script processing.
    setIsLoading(true);

    // Set up a callback function to update the state once the script processing is complete.
    processor.onScriptGenerated = (generatedScript) => {
      setScript(generatedScript);
      // Set the loading state to false once the script processing is complete.
      setIsLoading(false);
    };

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
      markdown={script}
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

// ScriptProvider로 ReadWithScript 컴포넌트를 감싸줍니다.
const WrappedReadWithScript = () => (
  <ScriptProvider>
    <ReadWithScript />
  </ScriptProvider>
);

export default WrappedReadWithScript;
