export interface Preferences {
  torrserverUrl: string;
  login: string;
  password: string;
  mediaPlayerApp: {
    name: string;
    bundleId: string;
    path: string;
  };
}
