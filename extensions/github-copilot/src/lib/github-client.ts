export const handleGitHubError = (error: unknown): Error => {
  if (error instanceof Error) {
    if (error.message.includes("Bad credentials")) {
      return new Error("Invalid GitHub token. Please check your credentials in preferences.");
    } else if (error.message.includes("rate limit")) {
      return new Error("GitHub API rate limit exceeded. Please try again later.");
    } else if (error.message.includes("ENOTFOUND") || error.message.includes("network")) {
      return new Error("Unable to connect to GitHub. Please check your internet connection.");
    } else if (error.message.includes("Resource protected by organization SAML enforcement")) {
      return new Error(
        "GitHub token is missing authorization for organizations that use SSO. Press Cmd + K then select 'Re-authenticate' to fix this.",
      );
    } else {
      return error;
    }
  }
  return new Error("Unknown GitHub API error occurred");
};
