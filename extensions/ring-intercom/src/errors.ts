export type RingAuthenticationErrorCode =
  | "NETWORK_ERROR"
  | "INVALID_CREDENTIALS"
  // There is no saved sign-in, or Ring no longer accepts it. Running Authenticate again fixes both.
  | "SIGNED_OUT";

export class RingAuthenticationError extends Error {
  public code: RingAuthenticationErrorCode;
  public userMessage: string;

  constructor(code: RingAuthenticationErrorCode, message: string, userMessage: string) {
    super(message);
    this.code = code;
    this.userMessage = userMessage;
    Object.setPrototypeOf(this, RingAuthenticationError.prototype);
  }
}

export function isSignedOut(error: unknown): error is RingAuthenticationError {
  return error instanceof RingAuthenticationError && error.code === "SIGNED_OUT";
}

export class TwoFactorError extends Error {
  type: string;
  // How Ring sends the code: "totp" (authenticator app), "sms" or "email".
  twoFactorType: string;
  phone?: string;
  tsv_state: string;

  constructor(tsvState: string, phone?: string) {
    super("Two-factor authentication required");
    this.type = "TwoFactorRequired";
    this.twoFactorType = tsvState;
    this.phone = phone;
    this.tsv_state = tsvState;
    Object.setPrototypeOf(this, TwoFactorError.prototype);
  }
}
