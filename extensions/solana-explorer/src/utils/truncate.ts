export const truncate = (str: string, start: number, end: number) => {
  return str.slice(0, start) + "..." + str.slice(str.length - end, str.length);
};

export const truncateSig = (sig: string) => {
  return truncate(sig, 12, 12);
};

export const truncateAddress = (address: string) => {
  return truncate(address, 8, 8);
};
