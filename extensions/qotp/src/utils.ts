import { authenticator } from "otplib";

//https://github.com/yeojz/otplib/issues/181#issuecomment-590244240
export function generate(secret: string, offset = 0) {
  if (offset === 0) {
    return authenticator.generate(secret);
  }
  const allOptions = authenticator.allOptions();
  const delta = allOptions.step * 1000;
  // step = 30s == the code changes every 30s.
  // same epoch == same code. so we can get the next code via set the epoch option
  authenticator.options = { epoch: Date.now() + offset * delta };
  const offsetToken = authenticator.generate(secret);
  authenticator.resetOptions();
  return offsetToken;
}
