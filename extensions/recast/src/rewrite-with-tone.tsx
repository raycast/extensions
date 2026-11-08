import {
  ActionPanel,
  Action,
  Icon,
  List,
  getPreferenceValues,
  openExtensionPreferences,
  useNavigation,
} from "@raycast/api";
import { TONE_DETAILS } from "./config";
import { ResultView } from "./result-view";
import { type Source, SourceForm, SourceLoading, useSource } from "./source";

export default function Command() {
  const source = useSource();
  const { push } = useNavigation();
  const preferences = getPreferenceValues<Preferences>();
  function selectTone(tone: string, captured: Source) {
    if (captured.text.trim())
      push(<ResultView source={captured} tone={tone} nested />);
    else
      push(
        <SourceForm
          source={captured}
          onSubmit={(value) =>
            push(<ResultView source={value} tone={tone} nested />)
          }
        />,
      );
  }
  if (!source) return <SourceLoading />;
  return (
    <List
      searchBarPlaceholder="Choose a tone…"
      selectedItemId={preferences.defaultTone}
    >
      <List.Section
        title={
          source.text.trim()
            ? "Rewrite Selected Text"
            : "Choose a Tone, Then Enter Text"
        }
      >
        {Object.entries(TONE_DETAILS).map(([tone, { title, description }]) => (
          <List.Item
            key={tone}
            id={tone}
            icon={Icon.Text}
            title={title}
            subtitle={description}
            accessories={
              tone === preferences.defaultTone ? [{ tag: "Default" }] : []
            }
            actions={
              <ActionPanel>
                <Action
                  title={`Rewrite ${title}`}
                  icon={Icon.Wand}
                  onAction={() => selectTone(tone, source)}
                />
                <Action
                  title="Open Extension Preferences"
                  icon={Icon.Gear}
                  onAction={openExtensionPreferences}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.EmptyView
        title="No Matching Tones"
        description="Try Friendly, Professional, Concise, Polished, or Neutral."
        icon={Icon.MagnifyingGlass}
      />
    </List>
  );
}
