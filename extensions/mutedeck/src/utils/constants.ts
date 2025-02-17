export const TROUBLESHOOTING_STEPS = `
1. Check if MuteDeck is running
2. Verify API endpoint in preferences
3. Ensure you're in an active meeting
4. Try restarting MuteDeck
5. Contact support if issue persists
`.trim();

export const MESSAGES = {
  MUTE: {
    SUCCESS: "Microphone Toggled",
    ERROR: "Failed to Toggle Microphone",
    CONFIRM_TITLE: "Toggle Microphone While Presenting?",
    CONFIRM_MESSAGE: "You are currently presenting or recording. Are you sure you want to toggle your microphone?",
  },
  VIDEO: {
    SUCCESS: "Camera Toggled",
    ERROR: "Failed to Toggle Camera",
    CONFIRM_TITLE: "Toggle Camera While Presenting?",
    CONFIRM_MESSAGE: "You are currently presenting or recording. Are you sure you want to toggle your camera?",
  },
  LEAVE: {
    SUCCESS: "Left Meeting",
    ERROR: "Failed to Leave Meeting",
    CONFIRM_TITLE: "Leave Meeting?",
    CONFIRM_MESSAGE: "Are you sure you want to leave the current meeting?",
  },
  STATUS: {
    ERROR: "Failed to Get Status",
    NOT_RUNNING: "MuteDeck Not Running",
    NO_MEETING: "Not in Meeting",
  },
};
