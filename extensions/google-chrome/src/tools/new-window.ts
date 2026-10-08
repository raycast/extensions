import { createNewTabToWebsite, createNewWindow } from "../actions";

type Input = {
  /** The website we should open a new window to, if one is provided. */
  website?: string;
};

export default async function (input: Input) {
  if (!input.website) {
    await createNewWindow();

    return "Opening new window";
  }

  await createNewTabToWebsite(input.website);

  return `Opening new window to ${input.website}`;
}
