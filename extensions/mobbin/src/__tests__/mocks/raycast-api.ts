export const environment = {
  supportPath: "/tmp/mobbin-raycast-test",
  isDevelopment: false,
  commandName: "test",
};

export const Clipboard = {
  copy: async () => undefined,
  paste: async () => undefined,
};

export const LocalStorage = {
  getItem: async () => undefined,
  setItem: async () => undefined,
  removeItem: async () => undefined,
};

export const OAuth = {
  RedirectMethod: { Web: "web", AppURI: "appURI" },
  PKCEClient: class {
    async getTokens() {
      return undefined;
    }

    async setTokens() {
      return undefined;
    }

    async removeTokens() {
      return undefined;
    }

    async authorize() {
      return { authorizationCode: "code" };
    }
  },
};

export function getPreferenceValues() {
  return {
    authMode: "api-key",
    apiKey: "secret",
    defaultPlatform: "ios",
    defaultSearchMode: "deep",
    defaultImageQuality: "optimized",
    defaultMcpImageFormat: "webp",
    defaultLimit: "20",
  };
}
