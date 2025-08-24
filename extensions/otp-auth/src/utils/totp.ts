import { Algorithm } from "decrypt-otpauth-ts/dist/decryptor";
import { TOTP } from "totp-generator";

const generateOtp = (secret: string, period: number, algorithm: Algorithm) => {
  const algorithmString =
    algorithm === Algorithm.SHA1
      ? "SHA-1"
      : algorithm === Algorithm.SHA256
        ? "SHA-256"
        : algorithm === Algorithm.SHA512
          ? "SHA-512"
          : "SHA-1";
  return TOTP.generate(secret, {
    period: period,
    algorithm: algorithmString,
  });
};

const calculateTimeLeft = (basis: number) => {
  return basis - (new Date().getSeconds() % basis);
};

export { generateOtp, calculateTimeLeft };
