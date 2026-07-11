export class BrowserBootstrapRequiredError extends Error {
  constructor(message = "Compatible rendering requires a browser. Open Mermaid to Image and choose Download Browser.") {
    super(message);
    this.name = "BrowserBootstrapRequiredError";
  }
}

export class ManagedBrowserInstallError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ManagedBrowserInstallError";
  }
}
