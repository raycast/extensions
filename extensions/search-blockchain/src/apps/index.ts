import solanaFm from "./SolanaFm";
import blockchair from "./Blockchair";
import cardanoscan from "./Cardanoscan";
import eosflare from "./Eosflare";
import etherscan from "./Etherscan";
import neoscan from "./Neoscan";
import ont from "./Ont";
import polygonscan from "./Polygonscan";
import steexp from "./Steexp";
import subscan from "./Subscan";
import tronscan from "./Tronscan";
import xmr from "./Xmr";
import xrpscan from "./Xrpscan";
import invariant from "tiny-invariant";
import type { App } from "#/types";

const apps: Record<string, App> = {
  Bitcoin: blockchair,
  Cardano: cardanoscan,
  EOS: eosflare,
  Ethereum: etherscan,
  NEO: neoscan,
  Ontology: ont,
  Polygon: polygonscan,
  Solana: solanaFm,
  Stellar: steexp,
  Polkadot: subscan,
  Tron: tronscan,
  Monero: xmr,
  XRP: xrpscan,
};

export function getApp(name: string) {
  const app = apps[name];
  invariant(app, `app '${name}' is not found`);
  return app;
}
