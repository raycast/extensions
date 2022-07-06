import { Clipboard, getPreferenceValues, showHUD } from "@raycast/api";
import fetch from "node-fetch";

export type QuestionType = "TRUTH" | "DARE" | "WYR" | "NHIE" | "PARANOIA";
export type Rating = "PG" | "PG13" | "R";

export async function fetchQuestion(type: QuestionType): Promise<{
  question: string;
  error: string;
}> {
  const ratings = getRatingsFromPrefrences(getPreferenceValues());
  return (await (
    await fetch(`https://api.truthordarebot.xyz/v1/${type}?` + new URLSearchParams(ratings.map((r) => ["rating", r])))
  ).json()) as {
    question: string;
    error: string;
  };
}

export function capitalizeFirstLetter(text: string) {
  return text.charAt(0).toUpperCase() + text.toLowerCase().slice(1);
}

export function getRatingsFromPrefrences({
  rating_pg,
  rating_pg13,
  rating_r,
}: {
  rating_pg: boolean;
  rating_pg13: boolean;
  rating_r: boolean;
}) {
  const ratings: Rating[] = [];
  if (rating_pg) ratings.push("PG");
  if (rating_pg13) ratings.push("PG13");
  if (rating_r) ratings.push("R");
  return ratings;
}

export async function copyQuestion(question: string) {
  await Clipboard.copy(question);
  showHUD("✅ Copied Question");
}
