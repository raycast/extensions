/**
 * Sign-in mail stays out of AI tools. The extension never offers a code to
 * Raycast AI, and that promise would be hollow if `get-thread` or
 * `search-mail` handed the same email over whole — or if a prompt injected
 * into another message could ask for it.
 */

const SIGN_IN_MAIL =
  /\b(?:verification|security|sign[\s-]?in|log[\s-]?in|login|one[\s-]?time|confirmation|authentication|2fa|otp)\s+(?:code|link|pin)\b|\bpasscode\b|\bmagic\s+link\b|\bpassword\s+reset\b|\breset\s+your\s+password\b/i;

export const REDACTED = "[Sign-in or verification email hidden from AI. Use the Copy Sign-In Code command instead.]";

export function looksLikeSignInMail(...parts: Array<string | null | undefined>): boolean {
  return parts.some((part) => !!part && SIGN_IN_MAIL.test(part));
}

export const REDACTED_SUBJECT = "[Sign-in email]";

/**
 * Withhold when the server flagged it (the same detector that reads codes) or
 * when the local pattern catches it — belt and braces, since the subject alone
 * often carries the code ("G-735102 is your Google verification code").
 */
export function shouldWithhold(serverFlag: boolean | undefined, ...parts: Array<string | null | undefined>): boolean {
  return serverFlag === true || looksLikeSignInMail(...parts);
}
