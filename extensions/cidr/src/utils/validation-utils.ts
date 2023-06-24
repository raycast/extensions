import { Ok, Err, Result } from "ts-results-es";
import { IPV4, CIDR, IPValidationError, Mask } from "./constants";

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

type ValidRes = IPV4 | CIDR;

function validateNetworkInfo(str: string, is_cidr: boolean): Result<ValidRes, IPValidationError> {
  const ipSections: number[] = [];

  let lastNum = -1;
  let hasMask = false;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    // 46 is '.', 47 is '/'
    if (char == 46 || char == 47) {
      if (lastNum == -1) {
        return Err({
          kind: "IP_VALIDATION_ERROR",
          msg: `each section in ${str} should be one valid number`,
        });
      }
      ipSections.push(lastNum);
      // reset memo
      lastNum = -1;
      hasMask = hasMask || char == 47;
      continue;
    }
    const num = char - 48; // 48 is '0'
    if (num < 0 || num > 9) {
      return Err({
        kind: "IP_VALIDATION_ERROR",
        msg: `${str} may contain non-numberic character`,
      });
    }
    lastNum = lastNum == -1 ? num : lastNum * 10 + num;
  }
  const mask: Mask = lastNum;
  if (!is_cidr) {
    ipSections.push(lastNum);
  }

  if (is_cidr && !hasMask) {
    return Err({
      kind: "IP_VALIDATION_ERROR",
      msg: `${str} should contain mask part`,
    });
  }

  if (!is_cidr && hasMask) {
    return Err({
      kind: "IP_VALIDATION_ERROR",
      msg: `${str} should not contain mask part`,
    });
  }

  if (ipSections.length != 4) {
    return Err({
      kind: "IP_VALIDATION_ERROR",
      msg: `${str} should contain 4 parts`,
    });
  }
  if (ipSections.filter((num) => num < 0 || num > 255).length != 0) {
    return Err({
      kind: "IP_VALIDATION_ERROR",
      msg: `each part in ${str} should between 0-255`,
    });
  }
  if (is_cidr && (mask <= 0 || mask > 32)) {
    return Err({
      kind: "IP_VALIDATION_ERROR",
      msg: `mask in ${str} shuold between 1-32`,
    });
  }
  const ipv4: [number, number, number, number] = [ipSections[0], ipSections[1], ipSections[2], ipSections[3]];

  return Ok(is_cidr ? [ipv4, mask] : ipv4);
}

export function validateCIDR(str: string): Result<CIDR, IPValidationError> {
  const res = validateNetworkInfo(str, true);
  if (res.ok) {
    return Ok(res.val as CIDR);
  }
  return res;
}

export function validateIPv4(str: string): Result<IPV4, IPValidationError> {
  const res = validateNetworkInfo(str, false);
  if (res.ok) {
    return Ok(res.val as IPV4);
  }
  return res;
}
