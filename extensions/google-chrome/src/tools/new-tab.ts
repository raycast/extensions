import { createNewTab, createNewTabToWebsite } from "../actions";

type Input = {
  /** The website we should open a new tab to, if one is provided. */
  website?: string;
};

export default async function (input: Input) {
  if (!input.website) {
    await createNewTab();

    return "Opening new tab";
  }

  await createNewTabToWebsite(input.website);

  return `Opening new tab to ${input.website}`;
}
