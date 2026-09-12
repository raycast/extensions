import { ActionPanel, Color, Icon, List, Action, getPreferenceValues } from "@raycast/api";
import WordDetailsView from "../Details/WordDetailsView";
import OpenInJotoba from "../../actions/OpenInJotoba";
import { parsePos } from "../../JotobaUtils";
import { useEffect, useState } from "react";
import WordListItemDetail from "./ListItemDetail/WordListItemDetail";

/**
 * Word item for displaying in search results.
 */
function WordListItem({ wordResult }: { wordResult: WordResult }) {
  const { posDisplayType, useEnglishFallback, userLanguage, showDetailsInList } = getPreferenceValues<Preferences>();
  const { id, reading, senses } = wordResult;
  const [accessoryTitle, setAccessoryTitle] = useState<string>();

  useEffect(() => {
    setAccessoryTitle(
      senses
        .filter((sense) => {
          if (useEnglishFallback && userLanguage !== "English") return sense.language === "English";

          return sense;
        })
        .map((sense) => {
          const parsedPoses = sense.pos.map((p) => parsePos(p, posDisplayType));

          if (parsedPoses.length === 0) return " " + sense.glosses.join("; ");

          return `【${parsedPoses.join("・")}】${sense.glosses.join("; ")}`;
        })
        .join(""),
    );
  }, [setAccessoryTitle]);

  return (
    <List.Item
      key={id}
      title={reading.kanji || reading.kana}
      subtitle={reading.kanji ? reading.kana : undefined}
      accessoryTitle={!showDetailsInList ? accessoryTitle : undefined}
      icon={
        (wordResult.common && {
          source: Icon.Dot,
          tintColor: Color.Green,
        }) ||
        undefined
      }
      detail={<WordListItemDetail wordResult={wordResult} />}
      actions={
        <ActionPanel>
          <Action.Push
            title={"View Details"}
            icon={Icon.AppWindowList}
            target={<WordDetailsView wordResult={wordResult} />}
          />
          {(reading.kanji || reading.kana) && <OpenInJotoba searchTerm={reading.kanji || reading.kana} />}
        </ActionPanel>
      }
    />
  );
}

export default WordListItem;
