import { InputTooLargeError } from "./input";
import { InvalidJsonStringError } from "./json-string";

export function getErrorMessage(error: unknown): string {
  if (
    error instanceof InputTooLargeError ||
    error instanceof InvalidJsonStringError
  ) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}
