export enum Tokens {
  ETH = "ethereum",
}

export const tokenDisplayProperties: Record<Tokens, { name: string; image: string }> = {
  [Tokens.ETH]: {
    name: "Ethereum",
    image: "ethereum.png",
  },
};

export const supportedTokens: Tokens[] = [Tokens.ETH] as const;
