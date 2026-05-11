export const isApiError = (error: Error) => error.cause === "validation_error" || error.cause === "restricted_api_key";
