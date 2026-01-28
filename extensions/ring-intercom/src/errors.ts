export class RingAuthenticationError extends Error {
  public code: "NETWORK_ERROR" | "INVALID_CREDENTIALS";
  public userMessage: string;

  constructor(code: "NETWORK_ERROR" | "INVALID_CREDENTIALS", message: string, userMessage: string) {
    super(message);
    this.code = code;
    this.userMessage = userMessage;
    Object.setPrototypeOf(this, RingAuthenticationError.prototype);
  }
}

export class TwoFactorError extends Error {
  type: string;
  twoFactorType: string;
  phone?: string;
  tsv_state: string;

  constructor(twoFactorType: string, phone?: string) {
    super("Two-factor authentication required");
    this.type = "TwoFactorRequired";
    this.twoFactorType = twoFactorType;
    this.phone = phone;
    this.tsv_state = twoFactorType; // Store the actual tsv_state
    Object.setPrototypeOf(this, TwoFactorError.prototype);
  }
}
