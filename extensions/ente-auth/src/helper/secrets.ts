import * as fs from "fs";
import * as OTPAuth from "otpauth";

export interface Secret {
  issuer: string;
  username: string;
  secret: string;
}

const parseSecretURL = (url: string): Secret => {
  const totp = OTPAuth.URI.parse(url);

  return {
    issuer: totp.issuer,
    username: totp.label,
    secret: totp.secret.base32,
  };
};

export const parseSecrets = (filePath: string = "secrets.txt"): Secret[] => {
  const secretsList: Secret[] = [];

  const data = fs.readFileSync(filePath, "utf8").split("\n");

  data.forEach((line) => {
    line = line.trim(); // Remove whitespace

    if (line) {
      try {
        secretsList.push(parseSecretURL(line));
      } catch (error) {
        console.error("Error parsing line:", line);
      }
    }
  });

  return secretsList;
};
