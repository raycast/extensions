import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  useNavigation,
} from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";
import { API_ENDPOINTS } from "../config/api";
import { useCorrectionChoices } from "../hooks/use-correction-choices";
import { fragmentOf, resultWithMatchLinked } from "../utils/match-display";
import {
  replaceActionTitle,
  replaceSelectionWith,
} from "../utils/replace-selection";
import type { CheckTextResponse, Language } from "../types";

const AUTO_DETECT = "auto";

type CorrectionsListProps = {
  textChecked: string;
  fromSelection: boolean;
  result: CheckTextResponse;
};

/**
 * The corrections, one per row, with the running result beside them. Enter
 * acts on the row being reviewed, as it does everywhere else in Raycast; the
 * text is replaced from the screen this was opened from.
 */
export function CorrectionsList({
  textChecked,
  fromSelection,
  result,
}: CorrectionsListProps) {
  // Read the shared state rather than take it as props: this view is pushed
  // onto the navigation stack, so props captured at push time never update.
  const {
    matches,
    applied,
    correctedText,
    chosenFor,
    setChoice,
    toggleChoice,
  } = useCorrectionChoices(textChecked, result);

  // The same guard as the screen this was opened from: this path used to
  // paste without checking that the selection was still the text reviewed.
  // Refusing here leaves the reader on the list, where Escape goes back to the
  // screen that can check the selection again.
  const onReplaceSelection = () =>
    replaceSelectionWith(correctedText, { textChecked, fromSelection });

  const { pop } = useNavigation();
  const { data: languages } = useFetch<Language[]>(API_ENDPOINTS.LANGUAGES);
  const [language, setLanguage] = useCachedState<string>(
    "selected-text-language",
    AUTO_DETECT,
  );

  // The check runs on the screen this was opened from, so a new language means
  // going back to it: these corrections belong to the old one and popping is
  // both the honest outcome and what re-runs the check.
  function changeLanguage(next: string) {
    if (next === language) return;
    setLanguage(next);
    pop();
  }

  const detected = result.language?.detectedLanguage?.name;
  const languageOptions = Array.from(
    new Map((languages ?? []).map((item) => [item.longCode, item])).values(),
  ).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <List
      isShowingDetail={matches.length > 0}
      navigationTitle="Corrections"
      searchBarPlaceholder="Type to narrow the corrections"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Language"
          value={language}
          onChange={changeLanguage}
        >
          <List.Dropdown.Item
            value={AUTO_DETECT}
            title={detected ? `Auto-detect — ${detected}` : "Auto-detect"}
          />
          {languageOptions.map((item) => (
            <List.Dropdown.Item
              key={item.longCode}
              value={item.longCode}
              title={item.name}
            />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
        title="No Issues Found"
        description="The text is already fine."
        actions={
          <ActionPanel>
            <Action
              title={replaceActionTitle(fromSelection)}
              icon={Icon.Text}
              onAction={onReplaceSelection}
            />
          </ActionPanel>
        }
      />

      {matches.map((match, index) => {
        const chosen = chosenFor(index);
        const isApplied = chosen !== null;
        const fragment = fragmentOf(match);

        const alternatives = Array.from(
          new Set(
            match.replacements
              .map((replacement) => replacement.value)
              .filter((value): value is string => Boolean(value)),
          ),
        );

        return (
          <List.Item
            key={index}
            icon={
              isApplied
                ? { source: Icon.CheckCircle, tintColor: Color.Green }
                : Icon.Circle
            }
            title={fragment}
            subtitle={isApplied ? `→ ${chosen}` : "Kept as is"}
            accessories={[{ text: match.shortMessage || match.message }]}
            detail={
              <List.Item.Detail
                markdown={resultWithMatchLinked(
                  textChecked,
                  result,
                  applied,
                  index,
                )}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Original"
                      text={{ value: fragment, color: Color.Red }}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Becomes"
                      text={
                        isApplied
                          ? { value: chosen, color: Color.Green }
                          : { value: "Unchanged", color: Color.SecondaryText }
                      }
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Issue"
                      text={match.message}
                    />
                    {match.rule?.category?.name && (
                      <List.Item.Detail.Metadata.Label
                        title="Category"
                        text={match.rule.category.name}
                      />
                    )}
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.TagList title="Replacement">
                      {alternatives.map((value) => (
                        <List.Item.Detail.Metadata.TagList.Item
                          key={value}
                          text={value}
                          color={value === chosen ? Color.Green : undefined}
                          onAction={() => setChoice(index, value)}
                        />
                      ))}
                      <List.Item.Detail.Metadata.TagList.Item
                        text={`Keep "${fragment}"`}
                        color={isApplied ? undefined : Color.Orange}
                        onAction={() => setChoice(index, null)}
                      />
                    </List.Item.Detail.Metadata.TagList>
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title={
                    isApplied ? "Skip This Correction" : "Apply This Correction"
                  }
                  icon={isApplied ? Icon.Undo : Icon.Check}
                  onAction={() => toggleChoice(index)}
                />
                {/* Second on purpose: Raycast gives the second action Cmd
                    Enter automatically, and no shortcut written here can take
                    it back. Finishing from this screen matters enough to claim
                    that slot — going back a screen just to accept the text
                    would be a poor exit. */}
                <Action
                  title={replaceActionTitle(fromSelection)}
                  icon={Icon.Text}
                  onAction={onReplaceSelection}
                />
                {alternatives.length > 1 && (
                  <ActionPanel.Submenu
                    title="Use Another Replacement…"
                    icon={Icon.List}
                  >
                    {alternatives.map((value) => (
                      <Action
                        key={value}
                        title={value}
                        onAction={() => setChoice(index, value)}
                      />
                    ))}
                  </ActionPanel.Submenu>
                )}
                {match.rule?.urls?.[0]?.value && (
                  <Action.OpenInBrowser
                    title="Why Is This Flagged?"
                    url={match.rule.urls[0].value}
                  />
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
