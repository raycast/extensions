import { FetchPopiconsError } from "../errors/fetch-popicons-error";

function isPopiconsApiError(err: unknown): err is FetchPopiconsError {
  if (err instanceof FetchPopiconsError) {
    return true;
  }

  return false;
}

export { isPopiconsApiError };
