import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  useNavigation,
} from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";
import { CorrectionsList } from "./components/corrections-list";
import { API_ENDPOINTS } from "./config/api";
import { useCorrectionChoices } from "./hooks/use-correction-choices";
import { useSelectedTextCheck } from "./hooks/use-selected-text-check";
import { resultWithAllMarked } from "./utils/match-display";
import {
  replaceActionTitle,
  replaceSelectionWith,
} from "./utils/replace-selection";
import { onBothPlatforms } from "./utils/shortcuts";
import type { Language } from "./types";

const AUTO_DETECT = "auto";

/**
 * Checks the text selected in any application and shows the result, ready to
 * be put back in place of the selection.
 *
 * Two screens rather than one: Raycast binds Enter to the first action of the
 * panel and shows that action in the footer, so a single screen would always
 * leave one of "replace everything" and "skip this correction" unannounced.
 * Split in two, each screen gives Enter to the obvious thing — replacing here,
 * toggling in the list — and neither needs explaining.
 */
export default function Command() {
  const { push } = useNavigation();
  const [language, setLanguage] = useCachedState<string>(
    "selected-text-language",
    AUTO_DETECT,
  );

  const { data: languages } = useFetch<Language[]>(API_ENDPOINTS.LANGUAGES);
  const {
    textChecked,
    fromSelection,
    result,
    isLoading,
    error,
    rereadSelection,
  } = useSelectedTextCheck(language);
  const { matches, applied, correctedText } = useCorrectionChoices(
    textChecked,
    result,
    { resetOnMount: true },
  );

  // The helper refuses when the selection is no longer the text that was
  // checked; checking it again here is what makes that refusal recoverable
  // rather than a dead end.
  async function replaceSelection() {
    const replaced = await replaceSelectionWith(correctedText, {
      textChecked,
      fromSelection,
    });
    if (!replaced) await rereadSelection();
  }

  // The API returns variants such as "English (US)"; one entry per code is enough
  const languageOptions = Array.from(
    new Map((languages ?? []).map((item) => [item.longCode, item])).values(),
  ).sort((a, b) => a.name.localeCompare(b.name));

  function reviewCorrections() {
    push(
      <CorrectionsList
        textChecked={textChecked}
        fromSelection={fromSelection}
        result={result}
      />,
    );
  }

  function body(): string {
    if (error) return `# Could Not Check the Text\n\n${error.message}`;
    if (isLoading) return "";
    if (!textChecked) {
      return "# No Text Found\n\nSelect some text, or copy it to the clipboard, then run this command again.";
    }
    return resultWithAllMarked(textChecked, result, applied);
  }

  // Nothing may be pasted over the selection unless the check actually came
  // back: on failure the result is just the untouched text, and replacing it
  // would look like the command had worked
  const canReplace = Boolean(textChecked) && !error && !isLoading;

  const detected = result.language?.detectedLanguage?.name;
  const skipped = matches.length - applied.size;

  return (
    <Detail
      isLoading={isLoading}
      markdown={body()}
      metadata={
        canReplace ? (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Corrections"
              text={
                matches.length === 0
                  ? "None found"
                  : skipped === 0
                    ? `All ${matches.length} applied`
                    : `${applied.size} of ${matches.length} applied`
              }
            />
            <Detail.Metadata.Label
              title="Language"
              text={result.language?.name ?? "…"}
            />
            <Detail.Metadata.Separator />
            {/* Clickable, which the labels above are not. A dismissed command
                can come back showing the previous run, and a view has no way
                to notice, so the way to refresh is put in reach of the mouse
                as well as of Cmd+Shift+R. */}
            <Detail.Metadata.TagList
              title={fromSelection ? "Selection" : "Clipboard"}
            >
              <Detail.Metadata.TagList.Item
                text="Check again"
                color={Color.Blue}
                onAction={rereadSelection}
              />
            </Detail.Metadata.TagList>
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        canReplace ? (
          <ActionPanel>
            <Action
              title={replaceActionTitle(fromSelection)}
              icon={Icon.Text}
              onAction={replaceSelection}
            />
            {matches.length > 0 && (
              <Action
                title="Review Corrections"
                icon={Icon.BulletPoints}
                onAction={reviewCorrections}
                shortcut={onBothPlatforms("r")}
              />
            )}
            {/* The language belongs on this screen because this is where the
                check runs: changing it from the pushed list could not re-run
                anything. */}
            <ActionPanel.Submenu
              title="Change Language…"
              icon={Icon.Globe}
              shortcut={onBothPlatforms("l")}
            >
              <Action
                title={detected ? `Auto-Detect — ${detected}` : "Auto-Detect"}
                icon={Icon.MagnifyingGlass}
                onAction={() => setLanguage(AUTO_DETECT)}
              />
              {languageOptions.map((item) => (
                <Action
                  key={item.longCode}
                  title={item.name}
                  onAction={() => setLanguage(item.longCode)}
                />
              ))}
            </ActionPanel.Submenu>
            <Action
              title={
                fromSelection
                  ? "Check the Selection Again"
                  : "Check the Clipboard Again"
              }
              icon={Icon.ArrowClockwise}
              onAction={rereadSelection}
              shortcut={onBothPlatforms("r", "shift")}
            />
            <Action.CopyToClipboard
              title="Copy Result"
              content={correctedText}
              shortcut={onBothPlatforms("c", "shift")}
            />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
