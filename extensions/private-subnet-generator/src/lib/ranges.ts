import { parsePrefix } from "./ip";

export const IPV4_LENGTH = 24;
export const IPV6_LENGTH = 48;

// RFC 1918, Section 3
export const PRIVATE_IPV4 = ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"].map(parsePrefix);

// RFC 4193, Section 3.1: fc00::/7 with the L bit set
export const PRIVATE_IPV6 = ["fd00::/8"].map(parsePrefix);

// iana-ipv4-special-registry-1.csv without the Private-Use blocks
export const SPECIAL_IPV4 = [
  "0.0.0.0/8",
  "0.0.0.0/32",
  "100.64.0.0/10",
  "127.0.0.0/8",
  "169.254.0.0/16",
  "192.0.0.0/24",
  "192.0.0.0/29",
  "192.0.0.8/32",
  "192.0.0.9/32",
  "192.0.0.10/32",
  "192.0.0.170/32",
  "192.0.0.171/32",
  "192.0.2.0/24",
  "192.31.196.0/24",
  "192.52.193.0/24",
  "192.88.99.0/24",
  "192.88.99.2/32",
  "192.175.48.0/24",
  "198.18.0.0/15",
  "198.51.100.0/24",
  "203.0.113.0/24",
  "240.0.0.0/4",
  "255.255.255.255/32",
].map(parsePrefix);

// De-facto reserved by vendors and common defaults
export const COMMON_IPV4 = [
  "10.0.0.0/24",
  "10.0.1.0/24",
  "10.42.0.0/16",
  "10.43.0.0/16",
  "10.88.0.0/16",
  "10.96.0.0/12",
  "10.244.0.0/16",
  "10.254.0.0/16",
  "10.255.0.0/16",
  "172.17.0.0/16",
  "192.168.0.0/24",
  "192.168.1.0/24",
  "192.168.2.0/24",
  "192.168.100.0/24",
  "192.168.178.0/24",
].map(parsePrefix);

// De-facto reserved by vendors and common defaults
export const COMMON_IPV6 = ["fd00::/48", "fd00:ec2::/32", "fdff:ffff:ffff::/48"].map(parsePrefix);

// iana-ipv6-special-registry-1.csv without the Unique-Local block
export const SPECIAL_IPV6 = [
  "::1/128",
  "::/128",
  "::ffff:0:0/96",
  "64:ff9b::/96",
  "64:ff9b:1::/48",
  "100::/64",
  "100:0:0:1::/64",
  "2001::/23",
  "2001::/32",
  "2001:1::1/128",
  "2001:1::2/128",
  "2001:1::3/128",
  "2001:2::/48",
  "2001:3::/32",
  "2001:4:112::/48",
  "2001:10::/28",
  "2001:20::/28",
  "2001:30::/28",
  "2001:db8::/32",
  "2002::/16",
  "2620:4f:8000::/48",
  "3fff::/20",
  "5f00::/16",
  "fe80::/10",
].map(parsePrefix);
