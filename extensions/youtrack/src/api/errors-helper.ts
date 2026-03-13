interface ErrorWithResponseData extends Error {
  response: {
    data?: {
      error_description: string;
    };
  };
}

function isErrorWithResponseData(error: unknown): error is ErrorWithResponseData {
  return (
    error instanceof Error && "response" in error && "data" in (error.response as ErrorWithResponseData["response"])
  );
}

function getErrorDescription(error: ErrorWithResponseData) {
  return error.response.data?.error_description || error.message;
}

export function handleOnCatchError(error: unknown, message: string) {
  if (isErrorWithResponseData(error)) {
    throw new Error(`${message}: "${getErrorDescription(error)}"`);
  } else {
    throw new Error(String(error));
  }
}
