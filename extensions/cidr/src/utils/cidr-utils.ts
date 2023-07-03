import { Err, Ok, Result } from "ts-results-es";
import { CIDR, IPV4, RangeConvertError } from "./constants";

export type CIDRDetail = {
  range: string;
  netmask: string;
  wildcardBits: string;
  firstIp: string;
  firstIpInt: number;
  lastIp: string;
  lastIpInt: number;
  totalHost: number;
};

function intToIPv4(ipInt: number): string {
  const arr = [(ipInt >> 24) & 255, (ipInt >> 16) & 255, (ipInt >> 8) & 255, ipInt & 255];
  return arr.join(".");
}

function intToIPv4Type(ipInt: number): IPV4 {
  return [(ipInt >> 24) & 255, (ipInt >> 16) & 255, (ipInt >> 8) & 255, ipInt & 255];
}

export function splitCIDR(cidr: CIDR): CIDRDetail {
  const [ip, maskInt] = cidr;
  const range = `${ip.join(".")}/${maskInt}`;

  const wildcard = (0x1 << (32 - maskInt)) - 1;
  const mask32 = 0xffffffff;
  const netmask = ~wildcard & mask32;

  const ipInt = ip.reduce((prev, curr) => (prev << 8) + curr, 0);

  // just in case, coerce to Uint32
  const firstIp = (ipInt & netmask) >>> 0;
  // just in case, coerce to Uint32
  const lastIp = (wildcard | firstIp) >>> 0;

  return {
    range: range,
    netmask: intToIPv4(netmask),
    wildcardBits: intToIPv4(wildcard),
    firstIp: intToIPv4(firstIp),
    firstIpInt: firstIp,
    lastIp: intToIPv4(lastIp),
    lastIpInt: lastIp,
    totalHost: lastIp - firstIp + 1,
  };
}

export function ipRangeToCIDR(ip1: IPV4, ip2: IPV4): Result<CIDR[], RangeConvertError> {
  const leftIP = ((ip1[0] << 24) + (ip1[1] << 16) + (ip1[2] << 8) + ip1[3]) >>> 0;
  const rightIP = ((ip2[0] << 24) + (ip2[1] << 16) + (ip2[2] << 8) + ip2[3]) >>> 0;

  if (leftIP > rightIP) {
    return Err({ kind: "IP_RANGE_FAILED_TO_CIDR_ERROR", msg: "Invalid IP range" });
  }
  const res: CIDR[] = [];

  let amount = rightIP - leftIP + 1;
  let ptrIP = leftIP;

  while (ptrIP <= rightIP) {
    let step = ptrIP & -ptrIP;
    if (step == 0) {
      // special case for 0.0.0.0
      step = 1;
      while (step < amount) {
        step = step << 1;
      }
    }
    while (step > amount) {
      step >>= 1;
    }
    res.push([intToIPv4Type(ptrIP), 32 - Math.log2(step)]);
    ptrIP += step;
    amount -= step;
  }
  return Ok(res);
}
