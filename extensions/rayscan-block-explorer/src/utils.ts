import { TokenType } from "./types";

export const shrinkText = (text: string) => {
  if (text.length <= 10) {
    return text;
  }
  return `${text.substring(0, 6)}...${text.substring(text.length - 4)}`;
}

export const getExplorerUrl = (type: TokenType | undefined, token: string | undefined, explorerBaseUrl: string) => {
  if (!type || !token) {
    return explorerBaseUrl;
  }
  switch (type) {
    case TokenType.Address:
      return `${explorerBaseUrl}address/${token}`;
    case TokenType.Tx:
      return `${explorerBaseUrl}tx/${token}`;
    case TokenType.BlockNumber:
      return `${explorerBaseUrl}block/${token}`;
    case TokenType.BlockHash:
      return `${explorerBaseUrl}block/${token}`;
    default:
      return explorerBaseUrl;
  }
}

export default {
  shrinkText,
  getExplorerUrl
}