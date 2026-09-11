/**
 * Configuration constants for the PromptNote Raycast extension
 */

// Base URLs
export const WEB_APP_URL = "https://app.promptnoteapp.com";
export const SITE_URL = "https://promptnoteapp.com";

// Feedback board URL (PromptNote board on FeatureBase)
export const FEEDBACK_URL =
  "https://iohpo.featurebase.app/?b=695f9152f13092ad189fb4de";

// OAuth callbacks still use the main domain (configured in Supabase)
export const OAUTH_CALLBACK_URL = `${SITE_URL}/auth/callback`;

// Create account points to the web app
export const CREATE_ACCOUNT_URL = WEB_APP_URL;

/**
 * Get URL for a specific note in the web app
 */
export const getNoteUrl = (noteId: string) => `${WEB_APP_URL}/note/${noteId}`;
