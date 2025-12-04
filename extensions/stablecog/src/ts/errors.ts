export const insufficientCreditsCode = "insufficient_credits";
export const nsfwPromptCode = "nsfw_prompt";

export const notEnoughCreditsString = "Not enough credits. Subscribe for more!";
export const nsfwPromptString = "This prompt might produce sensitive content!";

export function getErrorText(errorCode: string | unknown) {
  if (errorCode === "insufficient_credits") return "Not enough credits. Subscribe for more!";
  if (errorCode === "nsfw_prompt") return "This prompt might produce sensitive content!";
  if (typeof errorCode === "string") return errorCode;
  return "Something went wrong :(";
}
