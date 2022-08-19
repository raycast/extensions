export class NoHueBridgeConfiguredError extends Error {
  constructor() {
    super("No Hue Bridge configured");
  }
}

export class CouldNotConnectToHueBridgeError extends Error {
  constructor() {
    super("Hue Bridge not found");
  }
}
