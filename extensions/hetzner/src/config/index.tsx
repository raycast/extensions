interface Config {
  apiURL: string;
  consoleURL: string;
}

export function getConfig(): Config {
  return {
    apiURL: "https://api.hetzner.cloud",
    consoleURL: "https://console.hetzner.cloud",
  };
}
