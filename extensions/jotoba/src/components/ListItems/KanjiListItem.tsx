import { ActionPanel, List, Action, getPreferenceValues } from "@raycast/api";
import OpenInJotoba from "../../actions/OpenInJotoba";
import KanjiDetailsView from "../Details/KanjiDetailsView";
import { parseReadings } from "../../JotobaUtils";
import KanjiListItemDetail from "./ListItemDetail/KanjiListItemDetail";

/**
 * Kanji item for displaying in search results.
 */
function KanjiListItem({ kanjiResult }: { kanjiResult: KanjiResult }) {
  const { kanjiDetailsTitleDisplayType, showDetailsInList } = getPreferenceValues<Preferences>();
  const { literal, stroke_count, grade, jlpt, onyomi, kunyomi } = kanjiResult;
  const onTitle = { short: "on", long: "on readings", romaji: "onyomi" }[kanjiDetailsTitleDisplayType] ?? "";
  const kunTitle = { short: "kun", long: "kun readings", romaji: "kunyomi" }[kanjiDetailsTitleDisplayType] ?? "";

  const subtitle = (): string[] => {
    const subtitle: string[] = [];
    if (onyomi) subtitle.push(` ${onTitle.toUpperCase()}: ${parseReadings(onyomi)}`);
    if (kunyomi) subtitle.push(` ${kunTitle.toUpperCase()}: ${parseReadings(kunyomi)}`);
    return subtitle;
  };

  const accessoryTitle = (): string[] => {
    const accessoryTitle: string[] = [];

    if (stroke_count) accessoryTitle.push(`🖌 ${stroke_count}`);
    if (jlpt) accessoryTitle.push(`JLPT N${jlpt}`);
    if (grade) accessoryTitle.push(`🎓 ${grade}`);

    return accessoryTitle;
  };

  return (
    <List.Item
      title={literal}
      subtitle={showDetailsInList === "details" ? subtitle().join("") : ""}
      accessoryTitle={accessoryTitle().join("・")}
      detail={<KanjiListItemDetail kanjiResult={kanjiResult} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push title={"See more..."} target={<KanjiDetailsView kanjiResult={kanjiResult} />} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <OpenInJotoba searchTerm={literal} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default KanjiListItem;
