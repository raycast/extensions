export type TransientCopyOption = "always" | "passwords" | "never";

export type Preferences = {
  cliPath: string;
  clientId: string;
  clientSecret: string;
  fetchFavicons: boolean;
  serverUrl: string;
  serverCertsPath: string;
  repromptIgnoreDuration: string;
  generatePasswordQuickAction: "paste" | "copy" | "copyAndPaste";
  transientSearchOption: TransientCopyOption;
  transientGenerateOption: TransientCopyOption;
  transientGenerateQuickOption: TransientCopyOption;
};
