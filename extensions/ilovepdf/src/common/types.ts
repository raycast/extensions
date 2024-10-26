export type Status = "init" | "success" | "failure";

export type Preferences = {
  APIPublicKey: string;
  APISecretKey: string;
  OpenNow: boolean;
  AskBeforeDownload: boolean;
  SelectFileInFinder: boolean;
};
