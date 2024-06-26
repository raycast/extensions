import { Cache } from "@raycast/api";

const cache = new Cache();

const MASTER_KEY = "master-key";
const SECRET_KEY = "secret-key";
const PASSPHRASE = "passphrase";
const INIT_VECTOR = "init-vector";
const OTP_PERIOD = "otp-period";
const OTP_DIGITS = "otp-digits";

export function setMasterKey(value: string) {
  cache.set(MASTER_KEY, value);
}
export function getMasterKey() {
  return cache.get(MASTER_KEY);
}

export function setSecretKey(value: string) {
  cache.set(SECRET_KEY, value);
}
export function getSecretKey() {
  return cache.get(SECRET_KEY);
}

export function setPassphrase(value: string) {
  cache.set(PASSPHRASE, value);
}
export function getPassphrase() {
  return cache.get(PASSPHRASE);
}

export function setInitVector(value: string) {
  cache.set(INIT_VECTOR, value);
}
export function getInitVector() {
  return cache.get(INIT_VECTOR);
}

export function setOtpPeriod(value: string) {
  cache.set(OTP_PERIOD, value);
}
export function getOtpPeriod(): number {
  return parseInt(cache.get(OTP_PERIOD)!);
}

export function setOtpDigits(value: string) {
  cache.set(OTP_DIGITS, value);
}
export function getOtpDigits(): number {
  return parseInt(cache.get(OTP_DIGITS)!);
}

export function clear() {
  cache.clear();
}
