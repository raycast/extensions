const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export const isValidEthereumAddress = (address: string): boolean => ETH_ADDRESS_REGEX.test(address);
