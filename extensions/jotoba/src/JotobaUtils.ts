import * as fs from "fs";
import { environment } from "@raycast/api";

export const parseReadings = (readings: string[], asArray?: false | boolean) => {
  if (!readings || readings.length === 0) return "";

  if (asArray) return readings.map((reading) => reading.replace(".", "・").replace("-", "〜"));

  return readings.map((reading) => reading.replace(".", "・").replace("-", "〜")).join(", ");
};

export const parsePos = (unparsedPosData: string[] | PartOfSpeech, type?: string): string => {
  const posDataBuffer = fs.readFileSync(`${environment.assetsPath}/PartsOfSpeech.json`);

  const { simple: simplePosData, detailed: detailedPosData } = JSON.parse(posDataBuffer.toString());

  let posStr = "missing";
  let posMatch = null;
  if (typeof unparsedPosData === "object") {
    // There should never be more than one entry anyway...
    Object.entries(unparsedPosData).map((entry) => {
      const pos: Json = entry[0];
      const posDetailData: Json = entry[1];

      if (pos) {
        if (typeof posDetailData === "string") {
          posMatch = detailedPosData[pos][posDetailData];
        } else {
          const potentialPosGroupMatches = detailedPosData[pos];
          Object.entries(posDetailData).map((detailData) => {
            const posGroupName: Json = detailData[0];
            const posGroupType: Json = detailData[1];

            if (potentialPosGroupMatches[posGroupName] && posGroupType)
              posMatch = potentialPosGroupMatches[posGroupName].types[posGroupType];
          });
        }
      } else posMatch = detailedPosData[pos];
    });
  } else posMatch = simplePosData[unparsedPosData];

  if (posMatch) {
    switch (type) {
      case "long":
        posStr = posMatch.long;
        break;
      case "short":
        posStr = posMatch.short;
        break;
      case "klong":
        posStr = posMatch.kana?.long || posMatch.long;
        break;
      case "kshort":
        posStr = posMatch.kana?.short || posMatch.short || posMatch.kana?.long || posMatch.long;
        break;
      default:
        posStr = posMatch.long || posMatch;
    }
  }

  return posStr;
};
