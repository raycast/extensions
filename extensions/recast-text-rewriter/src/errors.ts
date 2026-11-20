export class RewriteError extends Error {
  override name = "RewriteError";
}

export function rewriteError(error: unknown): string {
  const name = error instanceof Error ? error.name : "";
  switch (name) {
    case "CredentialsProviderError":
    case "TokenProviderError":
    case "ExpiredTokenException":
    case "UnrecognizedClientException":
    case "InvalidSignatureException":
      return "AWS credentials are missing or expired. Sign in again with your profile’s login command (for example, aws sso login --profile <name>), then retry. Check Credential Method and AWS Profile in extension preferences.";
    case "AccessDeniedException":
      return "AWS denied this request. Check model access and bedrock:InvokeModelWithResponseStream permissions for the model and inference profile. Your organization’s policies must also allow the destination Regions.";
    case "ThrottlingException":
    case "ServiceQuotaExceededException":
      return "Bedrock is rate limiting requests. Wait a moment, then retry. A smaller Max Tokens value may help.";
    case "ResourceNotFoundException":
      return "The model or inference profile was not found. Check Model ID, AWS Region, and Inference Profile in extension preferences.";
    case "ValidationException":
      return "Bedrock rejected the configuration. Check that your model supports the selected Region, inference profile, Max Tokens, and Temperature. Leave Temperature empty for newer Claude models.";
    case "TimeoutError":
    case "ModelTimeoutException":
      return "Bedrock timed out. Try again or rewrite a shorter selection.";
    case "ServiceUnavailableException":
    case "InternalServerException":
    case "ModelStreamErrorException":
      return "Bedrock interrupted the rewrite. Wait a moment, then retry.";
  }
  if (error instanceof RewriteError) return error.message;
  if (name === "AbortError")
    return "Rewrite canceled. Retry whenever you’re ready.";
  // Credential helpers can include stdout/stderr in their errors. Never surface
  // raw provider diagnostics, credentials, or selected text in notifications.
  return "Could not connect to Bedrock. Check your connection and AWS setup, then retry.";
}
