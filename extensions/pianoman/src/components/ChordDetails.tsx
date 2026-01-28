import { Detail } from "@raycast/api";
import ChordKeyboard, { ChordKeyboardOptions } from "../components/ChordKeyboard";
import { urlDecodeKey, urlEncodeChord, trimLines, getSvgBase64 } from "../libs/helper";
import { Chord } from "../libs/chord";
import constants from "../libs/constants";
import { renderToString } from "react-dom/server";

export function getChordImageUrl({
  chord,
  options,
}: {
  chord: Chord;
  options?: ChordKeyboardOptions;
}) {
  return getSvgBase64(renderToString(<ChordKeyboard chord={chord} options={options} />));
}

export function getInversionsContent({
  chord,
  options,
}: {
  chord: Chord;
  options?: ChordKeyboardOptions;
}) {
  const inversionsMd = trimLines(
    chord.inversions.map((inversion) => {
      const inversionName = inversion.fullName.length > 0 ? inversion.fullName : inversion.alias[0];
      return `
      ### Inversion: ${inversionName}
      ![](${getChordImageUrl({ chord: inversion, options })})
      `;
    }),
  ).join("\n");

  return trimLines(`
  # ${chord.fullName}

  ![](${getChordImageUrl({ chord, options })})

  ${inversionsMd}
  `).join("\n");
}

export default function ChordDetails({ chord }: { chord: Chord }) {
  const options: ChordKeyboardOptions = {
    highlightColor: "#ff6363",
    whiteWidth: 18,
    whiteHeight: 80,
    blackWidth: 9,
    blackHeight: 50,
  };

  // Build metadata
  const pianoChordIoUrl = `https://pianochord.io/chord/${urlDecodeKey(
    chord.tonic,
  )}/${urlEncodeChord(chord.fullName)}`;
  const contentMd = getInversionsContent({ chord, options });

  return (
    <Detail
      markdown={contentMd}
      navigationTitle={chord.fullName}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Topic" text={chord.tonic} />
          <Detail.Metadata.Label title="Intervals" text={chord.intervals.join(", ")} />
          <Detail.Metadata.Label title="Quality" text={chord.quality} />
          <Detail.Metadata.TagList title="Aliases">
            {chord.alias.map((alias, index) => (
              <Detail.Metadata.TagList.Item
                key={index}
                text={alias}
                color={constants.colors.green}
              />
            ))}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Links" target={pianoChordIoUrl} text="Chordpiano.io" />
        </Detail.Metadata>
      }
    />
  );
}
