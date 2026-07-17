export const ERROR_MESSAGES = {
  safariDisabledJavaScript: "Enable the 'Allow JavaScript from Apple Events' option in Safari's Develop menu.",
  chromeDisabledJavaScript:
    "Enable the 'Allow JavaScript from Apple Events' option from the menu bar item: View > Developer.",
  unableToRun: (app: string) =>
    `Could not run Toggle Design Mode in ${app}. Make sure the frontmost app is Safari or Chrome.`,
};
