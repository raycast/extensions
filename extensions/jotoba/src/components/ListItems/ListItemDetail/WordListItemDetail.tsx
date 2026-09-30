import { Color, getPreferenceValues, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { parsePos } from "../../../JotobaUtils";
import useJotobaAsync from "../../../useJotobaAsync";

function WordListItemDetail({ wordResult }: { wordResult: WordResult }) {
  const { reading, common, senses, pitch } = wordResult;
  const { userLanguage, useEnglishFallback, detailsPosDisplayType } = getPreferenceValues<Preferences>();
  const [sentences, setSentences] = useState([]);
  const getJotobaResults = useJotobaAsync("sentences");

  const [parsedSenses, setParsedSenses] = useState<string>("");
  const [parsedPitch, setParsedPitch] = useState<string>("");

  const title = `${
    reading.kanji && reading.kanji !== reading.kana ? `${reading.kanji}【${reading.kana}】` : reading.kana
  }`;

  useEffect(() => {
    setParsedSenses(
      senses
        .reduce((acc: Sense[], currSense, index) => {
          if (currSense.language !== "English") {
            const firstNonEnglishIndex = acc.findIndex((sense) => sense.language !== "English");

            if (firstNonEnglishIndex > -1) {
              const slicedAcc = [...acc];
              const container = slicedAcc.splice(firstNonEnglishIndex, 1)[0];

              container.glosses = [...container.glosses, ...currSense.glosses];
              return [...slicedAcc, container];
            }
          }

          return [...acc, currSense];
        }, [])
        .map((sense) => {
          let posName = sense.pos.map((p) => parsePos(p, detailsPosDisplayType)).join(" ・ ");

          if (posName.length === 0) posName = sense.language;

          const glossesList = sense.glosses.map((gloss) => `- ${gloss}`).join(`\n`);

          if (userLanguage !== "English" && sense.language === userLanguage && !useEnglishFallback)
            return `## Definitions\n${glossesList}`;

          return `### ${posName}\n${glossesList}`;
        })
        .join(`\n`),
    );

    if (pitch)
      setParsedPitch(
        pitch.reduce((acc, curr) => {
          const { part, high } = curr;

          if (high) return acc + `↗${part}↘`;

          return acc + part;
        }, ""),
      );
  }, [setParsedPitch, setParsedSenses]);
  useEffect(() => {
    (async () => {
      try {
        const resultSentences = (await getJotobaResults({
          bodyData: {
            query: reading.kanji || reading.kana,
            no_english: !useEnglishFallback,
            language: userLanguage,
          },
        })) as Json;

        if (!resultSentences) throw new Error("No sentences found.");

        setSentences((prevState) =>
          resultSentences.sentences
            .map((sentence: JotobaSentence) => `- ${sentence.content} → ${sentence.translation}`)
            .join("\n"),
        );
      } catch (err) {
        console.error(err);
        showToast(Toast.Style.Failure, "Could not fetch example sentences.", String(err));
      }
    })();
  }, [setSentences]);

  return (
    <List.Item.Detail
      markdown={`# ${title}
            \n${parsedPitch || ""}
            \n${parsedSenses || ""}
            \n${
              (sentences.length > 0 &&
                `## Example Sentences
                \n${sentences}`) ||
              ""
            }
            `}
    />
  );
}

export default WordListItemDetail;
