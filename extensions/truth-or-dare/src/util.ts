import { Clipboard, getPreferenceValues, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";

export type QuestionType = "TOD" | "TRUTH" | "DARE" | "WYR" | "NHIE" | "PARANOIA";
export type Rating = "PG" | "PG13" | "R";
export const gameNames = {
  TOD: "Truth or Dare",
  WYR: "Would You Rather",
  NHIE: "Never Have I Ever",
  PARANOIA: "Most Likely To",
  TRUTH: "Truth",
  DARE: "Dare",
};

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
  showToast({ title: "Copied Question!", style: Toast.Style.Success });
}
