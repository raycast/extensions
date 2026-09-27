const NO_DETAILS_MESSAGE =
  "Something failed without giving a reason. Try again, and open an issue if it keeps happening.";

export const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message !== "") return error.message;
  if (typeof error === "string" && error !== "") return error;
  return NO_DETAILS_MESSAGE;
};
