import { Clipboard, showHUD } from "@raycast/api";
import { properties } from "./properties";
import * as Cache from "./cache";
import { decodeDeriveKey, calculateHOTP, decodeSecretKey } from "./crypto";

function initCache() {
  const masterKey = Cache.getMasterKey();
  if (!masterKey) Cache.setMasterKey(decodeDeriveKey(properties.deviceID));
  const query = new URL(properties.qrCodeDeeplink);
  const passphrase = Cache.getPassphrase();
  if (!passphrase) Cache.setPassphrase(query.searchParams.get("secret")!);
  const iv = Cache.getInitVector();
  if (!iv) Cache.setInitVector(query.searchParams.get("iv")!);
  const secretKey = Cache.getSecretKey();
  if (!secretKey) Cache.setSecretKey(decodeSecretKey(masterKey!, passphrase!, iv!));
  const otpPeriod = Cache.getOtpPeriod();
  if (!otpPeriod) Cache.setOtpPeriod(query.searchParams.get("period")!);
  const otpDigits = Cache.getOtpDigits();
  if (!otpDigits) Cache.setOtpDigits(query.searchParams.get("digits")!);
}
/***
 *
 *
 */
export default () => {
  initCache();
  const otpValue = calculateHOTP(Cache.getSecretKey()!, Cache.getOtpPeriod(), Cache.getOtpDigits());
  Clipboard.copy(otpValue, { concealed: true });
  showHUD(`🔐 [${otpValue}] otp copied to clipboard!`);
};
