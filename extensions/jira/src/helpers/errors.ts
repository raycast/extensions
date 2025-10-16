export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    try {
      const parsedError = JSON.parse(error.message);
      if (parsedError.errorMessages && Array.isArray(parsedError.errorMessages)) {
        return parsedError.errorMessages[0];
      }
    } catch (e) {
      return error.message;
    }
  }

  return String(error);
}
