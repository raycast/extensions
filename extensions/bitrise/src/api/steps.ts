/* eslint-disable @typescript-eslint/no-explicit-any */
import fetch from "node-fetch";
import { StepCollection, Step } from "./types";

export async function fetchSteps(): Promise<StepCollection> {
  const response = await fetch("https://bitrise-steplib-collection.s3.amazonaws.com/slim-spec.json.gz");

  if (!response.ok) {
    throw new Error("HTTP error " + response.status);
  }

  const json: any = await response.json();
  const steps = (Object.entries(json["steps"]) as any[]).map<Step>(([id, stepData]) => {
    const latestVersion: any = Object.values(stepData["versions"])[0];
    return {
      id: id,
      maintainer: stepData["info"]["maintainer"],
      iconURL: stepData["info"]?.["asset_urls"]?.["icon.svg"],
      title: latestVersion["title"],
      publishedAt: new Date(latestVersion["published_at"]),
      sourceURL: latestVersion["source_code_url"],
    };
  });

  steps.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

  return {
    updatedAt: new Date(json["generated_at_timestamp"]),
    steps: steps,
  };
}
