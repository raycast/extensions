import { chainData } from "./data";
import { ParsedToken, TokenType } from "./types";

export const parser = (searchText: string) => {
  const searchTerms = searchText.toLowerCase().trim().split(" ");

  const parsedToken: ParsedToken = { networks: [] };
  for (const term of searchTerms) {
    if (term && term.length > 0) {
      if (term.startsWith("0x") && term.length === 42) {
        parsedToken.type = TokenType.Address;
        parsedToken.token = term;
      } else if (term.startsWith("0x") && term.length === 66) {
        parsedToken.type = TokenType.Tx;
        parsedToken.token = term;
      }
      else if (!isNaN(Number(term))) {
        parsedToken.type = TokenType.BlockNumber;
        parsedToken.token = term;
      } else {
        // const chains = chainData.flatMap((chain) => chain.keywords.includes(term) ? chain : []);
        const chains = chainData.filter((chain) => chain.name.toLowerCase().includes(term));
        if (chains.length > 0) {
          parsedToken.networks.push(...chains);
        }
      }
    }
  }
  if (parsedToken.networks.length === 0) {
    parsedToken.networks = chainData;
  }
  return parsedToken;
}