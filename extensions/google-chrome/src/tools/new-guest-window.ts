import { createNewGuestWindow, createNewGuestWindowToWebsite } from "../actions";

type Input = {
  /** The website we should open a new guest window to, if one is provided. */
  website?: string;
};

export default async function (input: Input) {
  if (!input.website) {
    await createNewGuestWindow();

    return "Opening new guest window";
  }

  await createNewGuestWindowToWebsite(input.website);

  return `Opening new guest window to ${input.website}`;
}
