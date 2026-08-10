export interface Account {
  pubkey: string;
  isSigner: boolean;
  isWritable: boolean;
  preBalance: number;
  postBalance: number;
  balanceChange: number;
}
