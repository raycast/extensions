import { Action, ActionPanel, Color, Icon, List, openCommandPreferences, showToast } from "@raycast/api";
import { SUPERWHISPER_BUNDLE_ID } from "./utils";
import { useModes } from "./hooks";

export interface Mode {
  key: string;
  name: string;
  description?: string;
  adjustOutputVolume?: boolean;
  language?: string;
  useSystemAudio?: boolean;
  diarize?: boolean;
  literalPunctuation?: boolean;
  languageModelID?: string;
  contextFromClipboard?: boolean;
  translateToEnglish?: boolean;
  voiceModelID?: string;
  realtimeOutput?: boolean;
  contextFromActiveApplication?: boolean;
}

export default function Command() {
  const { modes, isLoading, error } = useModes();
  const isShowingDetail = !isLoading && !error && (modes?.length || 0) > 0;

  return (
    <List isLoading={isLoading} isShowingDetail={isShowingDetail}>
      {error && (
        <List.EmptyView
          title="Failed to fetch modes"
          description={error.message}
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              {error.message.includes("not installed") ? (
                <Action.OpenInBrowser url="https://superwhisper.com" title={"Install From superwhisper.com"} />
              ) : (
                <Action icon={Icon.Gear} title={"Open Preferences"} onAction={openCommandPreferences} />
              )}
            </ActionPanel>
          }
        />
      )}
      {!isLoading && !error && modes?.length === 0 && (
        <List.EmptyView
          title="No modes found"
          description="Check if mode directory is correct."
          icon={{ source: Icon.Warning, tintColor: Color.Orange }}
          actions={
            <ActionPanel>
              <Action icon={Icon.Gear} title={"Open Preferences"} onAction={openCommandPreferences} />
            </ActionPanel>
          }
        />
      )}
      {modes?.map(
        (
          {
            key,
            name = "Default",
            description = "",
            adjustOutputVolume,
            language,
            useSystemAudio,
            diarize,
            literalPunctuation,
            languageModelID,
            contextFromClipboard,
            translateToEnglish,
            voiceModelID,
            realtimeOutput,
            contextFromActiveApplication,
          },
          index,
        ) => (
          <List.Item
            key={key}
            icon={Icon.Waveform}
            title={name}
            subtitle={`⌘${index + 1}`}
            detail={
              <List.Item.Detail
                markdown={description ? description : undefined}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Key" text={key} />
                    <List.Item.Detail.Metadata.Label title="Name" text={name} />
                    {language && (
                      <List.Item.Detail.Metadata.Label
                        title="Language"
                        text={language}
                        icon={{ source: Icon.Microphone, tintColor: Color.Blue }}
                      />
                    )}
                    {languageModelID && (
                      <List.Item.Detail.Metadata.Label
                        title="Language Model ID"
                        text={languageModelID}
                        icon={{ source: Icon.Dna, tintColor: Color.Yellow }}
                      />
                    )}
                    {voiceModelID && (
                      <List.Item.Detail.Metadata.Label
                        title="Voice Model ID"
                        text={voiceModelID}
                        icon={{ source: Icon.Waveform, tintColor: Color.Blue }}
                      />
                    )}
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Adjust Output Volume"
                      {...booleanProps(!!adjustOutputVolume)}
                    />
                    <List.Item.Detail.Metadata.Label title="Use System Audio" {...booleanProps(!!useSystemAudio)} />
                    <List.Item.Detail.Metadata.Label title="Diarize" {...booleanProps(!!diarize)} />
                    <List.Item.Detail.Metadata.Label
                      title="Literal Punctuation"
                      {...booleanProps(!!literalPunctuation)}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Context From Clipboard"
                      {...booleanProps(!!contextFromClipboard)}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Translate To English"
                      {...booleanProps(!!translateToEnglish)}
                    />
                    <List.Item.Detail.Metadata.Label title="Realtime Output" {...booleanProps(!!realtimeOutput)} />
                    <List.Item.Detail.Metadata.Label
                      title="Context From Active Application"
                      {...booleanProps(!!contextFromActiveApplication)}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            accessories={[
              ...(language
                ? [
                    {
                      text: language,
                      icon: { source: Icon.Microphone, tintColor: Color.Blue },
                      tooltip: `Language: ${language}`,
                    },
                  ]
                : []),
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title={name}>
                  <Action.Open
                    icon={Icon.Circle}
                    title={`Select ${name} Mode`}
                    target={`superwhisper://mode?key=${key}`}
                    application={SUPERWHISPER_BUNDLE_ID}
                    onOpen={() => showToast({ title: `Selected ${name} mode for Superwhisper` })}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ),
      )}
    </List>
  );
}

function booleanProps(flag: boolean) {
  return {
    text: { value: flag ? "Yes" : "No", color: flag ? Color.Green : Color.Red },
    icon: { source: flag ? Icon.Checkmark : Icon.Xmark, tintColor: flag ? Color.Green : Color.Red },
  };
}
