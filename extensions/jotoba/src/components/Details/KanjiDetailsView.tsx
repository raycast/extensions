import { ActionPanel, Detail, getPreferenceValues } from "@raycast/api";
import OpenInJotoba from "../../actions/OpenInJotoba";
import { parseReadings } from "../../JotobaUtils";

/**
 * Kanji details view for displaying... more details about a kanji
 * without opening the website.
 */
function KanjiDetailsView({ kanjiResult }: { kanjiResult: KanjiResult }) {
  const { kanjiDetailsTitleDisplayType } = getPreferenceValues<Preferences>();
  const { literal, onyomi, kunyomi, stroke_count, jlpt, grade } = kanjiResult;

  const onTitle = { short: "on", long: "on readings", romaji: "onyomi" }[kanjiDetailsTitleDisplayType] ?? "";
  const parsedOnReadings = onyomi && parseReadings(onyomi);

  const kunTitle = { short: "kun", long: "kun readings", romaji: "kunyomi" }[kanjiDetailsTitleDisplayType] ?? "";
  const parsedKunReadings = kunyomi && parseReadings(kunyomi);

  return (
    <Detail
      navigationTitle={`Jotoba ・${literal}`}
      markdown={`# ${literal}\n - ${stroke_count} strokes\n - JLPT N${jlpt}\n - Grade ${grade} ${
        onyomi ? `\n## ${onTitle.toUpperCase()}\n${parsedOnReadings || ""}` : ""
      }${kunyomi ? `\n## ${kunTitle.toUpperCase()}\n${parsedKunReadings || ""}` : ""}`}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenInJotoba searchTerm={literal} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default KanjiDetailsView;
