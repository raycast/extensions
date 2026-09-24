import { Action, ActionPanel, Color, Icon, Keyboard, List, openExtensionPreferences, type Image } from "@raycast/api";
import { accessTokenSettingsUrl } from "../helpers/instanceUrl";
import { describeSetup, type SetupState, type Tone } from "./setupStatus";

type Props = SetupState & { onRetry: () => void };

const TONE_ICONS = {
  pending: { source: Icon.CircleProgress },
  success: { source: Icon.CheckCircle, tintColor: Color.Green },
  failure: { source: Icon.XMarkCircle, tintColor: Color.Red },
  neutral: { source: Icon.Circle },
} satisfies Record<Tone, Image.ImageLike>;

const TONE_TAG_COLORS: Partial<Record<Tone, Color>> = {
  success: Color.Green,
  failure: Color.Red,
};

export const SetupGuide = ({ onRetry, ...state }: Props) => {
  const setup = describeSetup(state);
  const tokenUrl = accessTokenSettingsUrl(state.instanceUrl);

  return (
    <List isLoading={state.isLoading} navigationTitle="Setup Memos">
      <List.Section title="Status">
        <List.Item
          title={setup.connection.title}
          subtitle={setup.connection.subtitle}
          icon={TONE_ICONS[setup.connection.tone]}
          accessories={[{ text: state.instanceUrl, tooltip: setup.connection.subtitle }]}
          actions={
            <ActionPanel>
              <Action
                title="Test Connection Again"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={onRetry}
              />
              {state.errorMessage != null ? (
                <Action.CopyToClipboard title="Copy Error Message" content={state.errorMessage} />
              ) : null}
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              <Action.OpenInBrowser
                title="Open Memos"
                url={state.instanceUrl}
                shortcut={Keyboard.Shortcut.Common.Open}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Settings">
        <List.Item
          title="Instance URL"
          subtitle={state.instanceUrl}
          icon={Icon.Globe}
          accessories={setup.instance.tag == null ? [] : [{ tag: setup.instance.tag }]}
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              <Action.OpenInBrowser
                title="Open Memos"
                url={state.instanceUrl}
                shortcut={Keyboard.Shortcut.Common.Open}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Access Token"
          icon={Icon.Key}
          accessories={[
            {
              tag: {
                value: setup.token.tag,
                color: TONE_TAG_COLORS[setup.token.tone],
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Get Access Token"
                url={tokenUrl}
                shortcut={{
                  macOS: { modifiers: ["cmd"], key: "t" },
                  Windows: { modifiers: ["ctrl"], key: "t" },
                }}
              />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              <Action
                title="Test Connection Again"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={onRetry}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
};
