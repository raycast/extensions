export interface OTPConfig {
  id: string;
  name: string;
  issuer?: string;
  secret: string;
  algorithm: "SHA1" | "SHA256" | "SHA512";
  digits: number;
  period: number;
}
