export interface VerificationCode {
  code: string | null;
  email: string;
  receivedAt: Date;
  sender: string;
  emailText: string;
}
