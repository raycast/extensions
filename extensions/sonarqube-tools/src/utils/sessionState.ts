/**
 * Session state management utilities
 *
 * This file contains utilities for managing session-level state
 * that should persist during a single Raycast command execution
 * but not between executions.
 */

// Session state for tracking whether certain UI elements have been shown
interface SessionUIState {
  // Track whether we've shown the SonarQube path prompt to avoid repeated prompts in the same session
  hasShownSonarQubePathPrompt: boolean;
}

// Initialize global session state
const sessionState: SessionUIState = {
  hasShownSonarQubePathPrompt: false,
};

/**
 * Get the current session state
 */
export function getSessionState(): SessionUIState {
  return sessionState;
}

/**
 * Mark that we've shown the SonarQube path prompt during this session
 */
export function markSonarQubePathPromptAsShown(): void {
  sessionState.hasShownSonarQubePathPrompt = true;
}

/**
 * Check whether the SonarQube path prompt has been shown during this session
 */
export function hasSonarQubePathPromptBeenShown(): boolean {
  return sessionState.hasShownSonarQubePathPrompt;
}
