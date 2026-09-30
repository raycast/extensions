import { Address4, Address6 } from "ip-address";

export const isValidIp = (ip: string): boolean => Address4.isValid(ip) || Address6.isValid(ip);
