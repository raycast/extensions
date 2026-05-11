import { Masternode } from "./masternode";

export type DefichainStats = {
  blockHeight: number;
  dfiPrice: number;
  amountAuctions: number;
  amountVaults: number;
  masternode: Masternode;
  difficulty: string;
};
