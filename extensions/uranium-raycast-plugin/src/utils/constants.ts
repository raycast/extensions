export const smartContractNameRegex =
  // eslint-disable-next-line no-useless-escape
  /^(?=[a-zA-Z0-9._\-\[\]]{3,30}$)(?!.*[_.\-\[\]]{2})[^_.\-\[\]].*[^_.\-\[\]]$/gm;
export const smartContractSymbolRegex = /^(?=[a-zA-Z0-9_]{3,30}$)(?!.*[_]{2})[^_].*[^_]$/gm;

export const SMART_CONTRACTS_USER_LIMIT = 5;
export const SMART_CONTRACTS_ADMIN_LIMIT = 10;
