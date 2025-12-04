export const ERROR_MAPPINGS: { [key: string]: string } = {
  ZONE_NOT_FOUND: "Please log into https://icloud.com/ to manually finish setting up your iCloud service",
  "-20101": "Invalid credentials",
  "-20283": "Invalid credentials",
  "421": "Authentication required for account.",
  "450": "Authentication required for account.",
  "500": "Authentication required for account.",
};

export class iCloudError extends Error {
  constructor(message: string, options: ErrorOptions = {}) {
    super(message, options);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class iCloudAPIResponseError extends iCloudError {
  constructor(reason: string, options: ErrorOptions = {}) {
    const message = reason || "";
    super(message, options);
  }
}

export class iCloud2SARequiredError extends iCloudError {
  constructor(appleID: string) {
    const message = `Two-step authentication required for account: ${appleID}`;
    super(message);
  }
}

export class iCloudServiceNotActivatedError extends iCloudAPIResponseError {}
export class iCloudFailedLoginError extends iCloudError {}
export class iCloudSessionExpiredError extends iCloudError {}
export class iCloud2FAError extends iCloudError {}
export class iCloudNetworkError extends iCloudError {}
