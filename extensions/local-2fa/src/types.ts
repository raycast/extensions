export type TotpAlgorithm = "SHA1" | "SHA256" | "SHA512";

export type TotpDigits = 6 | 8;

export type TotpAccount = {
  id: string;
  issuer: string;
  account: string;
  secretBase32: string;
  digits: TotpDigits;
  period: number;
  algorithm: TotpAlgorithm;
  createdAt: string;
};

export type OtpauthPayload = {
  issuer: string;
  account: string;
  secretBase32: string;
  digits: TotpDigits;
  period: number;
  algorithm: TotpAlgorithm;
};

export type EncryptedPayload = {
  version: 1 | 2;
  salt: string;
  iv: string;
  ciphertext: string;
  tag: string;
  iterations?: number;
};
