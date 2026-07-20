import { getPreferenceValues, List } from "@raycast/api";
import { nanoid } from "nanoid";
import { parseReadings } from "../../../JotobaUtils";

function KanjiListItemDetail({ kanjiResult }: { kanjiResult: KanjiResult }) {
  const { kanjiDetailsTitleDisplayType } = getPreferenceValues<Preferences>();
  const { literal, onyomi, kunyomi } = kanjiResult;

  const jotobaFrameURL = `https://jotoba.de/resource/kanji/frames/`;

  const onTitle = { short: "on", long: "on readings", romaji: "onyomi" }[kanjiDetailsTitleDisplayType] ?? "";

  const parsedOnReadings = ((onyomi && parseReadings(onyomi, true)) || []) as string[];

  const kunTitle = { short: "kun", long: "kun readings", romaji: "kunyomi" }[kanjiDetailsTitleDisplayType] ?? "";

  const parsedKunReadings = ((kunyomi && parseReadings(kunyomi, true)) || []) as string[];

  return (
    <List.Item.Detail
      markdown={`# ${literal}\n ![Illustration](${jotobaFrameURL}${encodeURIComponent(literal)})`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title={onTitle.toUpperCase()}>
            {parsedOnReadings.map((on) => (
              <List.Item.Detail.Metadata.TagList.Item key={nanoid()} text={on} />
            ))}
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.TagList title={kunTitle.toUpperCase()}>
            {parsedKunReadings.map((kun) => (
              <List.Item.Detail.Metadata.TagList.Item key={nanoid()} text={kun} />
            ))}
          </List.Item.Detail.Metadata.TagList>
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export default KanjiListItemDetail;
