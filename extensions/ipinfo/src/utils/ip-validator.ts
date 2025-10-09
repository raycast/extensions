const isValidIpV4 = (ip: string): boolean => {
  const ipv4Regex =
    /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipv4Regex.test(ip);
};

const isValidIpV6 = (ip: string): boolean => {
  const ipv6Regex = /^((([0-9A-Fa-f]{1,4}:){1,6}:)|(([0-9A-Fa-f]{1,4}:){7}))([0-9A-Fa-f]{1,4})$/;
  return ipv6Regex.test(ip);
};

export const isValidIp = (ip: string): boolean => {
  return isValidIpV4(ip) || isValidIpV6(ip);
};
