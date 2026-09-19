/** Blip cannot be reached: the app is not running, or it dropped the connection. */
export class BlipUnavailableError extends Error {
  constructor(message = "Blip is not running") {
    super(message);
    this.name = "BlipUnavailableError";
  }
}

/** Blip was reachable but did not answer usefully. */
export class BlipRpcError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BlipRpcError";
  }
}
