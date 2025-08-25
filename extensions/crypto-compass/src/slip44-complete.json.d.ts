// TypeScript declaration for slip44-complete.json
declare const slip44Data: Record<
  string,
  {
    index: string;
    hex: string;
    symbol: string;
    name: string;
    decimals?: number;
    networkType?: string;
    tokenStandards?: string[];
    aliases?: string[];
  }
>;

export default slip44Data;
