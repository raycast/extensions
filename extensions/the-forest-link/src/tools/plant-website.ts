import { Tool } from "@raycast/api";

import { normalizeWebsiteUrl, plantWebsite } from "../the-forest";

type Input = {
  /** Full HTTP or HTTPS address of the website to submit, such as https://example.com/. */
  website: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const website = normalizeWebsiteUrl(input.website);
  return {
    message: "Submit this website to The Forest for consideration? It may become publicly discoverable.",
    info: [{ name: "Website", value: website }],
  };
};

/** Submits a website to The Forest for consideration. The site may or may not be accepted. */
export default async function plant(input: Input) {
  const website = normalizeWebsiteUrl(input.website);
  await plantWebsite(website);
  return {
    website,
    submitted: true,
    message: "Website submitted. Maybe it will sprout, maybe it won't.",
  };
}
