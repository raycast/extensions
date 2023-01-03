import { ActionPanel, List, Action, getPreferenceValues, Icon } from "@raycast/api";
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
  const onTitle =
    kanjiDetailsTitleDisplayType === "jp" ? "音読み" : kanjiDetailsTitleDisplayType === "kana" ? "オン" : "onyomi";
  const kunTitle =
    kanjiDetailsTitleDisplayType === "jp" ? "訓読み" : kanjiDetailsTitleDisplayType === "kana" ? "くん" : "kunyomi";

  const subtitle = (): string[] => {
    const subtitle: string[] = [];
    if (onyomi) subtitle.push(`【${onTitle}】: ${parseReadings(onyomi)}`);
    if (kunyomi) subtitle.push(`【${kunTitle}】: ${parseReadings(kunyomi)}`);
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
      subtitle={!showDetailsInList ? subtitle().join("") : ""}
      accessoryTitle={accessoryTitle().join("・")}
      detail={<KanjiListItemDetail kanjiResult={kanjiResult} />}
      actions={
        <ActionPanel>
          <Action.Push
            title={"View Details"}
            icon={Icon.AppWindowList}
            target={<KanjiDetailsView kanjiResult={kanjiResult} />}
          />
          <OpenInJotoba searchTerm={literal} />
        </ActionPanel>
      }
    />
  );
}

export default KanjiListItem;
