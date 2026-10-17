export const MESSAGES = {
  ERROR: "massCode app is not running or port is not correct.",
  UNAUTHORIZED: "massCode API token is missing or invalid.",
  UNAUTHORIZED_HINT: "Generate a token in massCode Preferences > API.",
  CONTENT_UNAVAILABLE: "Snippet fragment is unavailable. It may have been deleted or not yet downloaded.",
  API_ERROR: (status: number) => `massCode API error: ${status}`,
};
