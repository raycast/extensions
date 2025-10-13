import "cross-fetch/polyfill";
import { connectWallet } from "./wallet";
import { CashuMint, CashuWallet, MeltQuoteResponse, MeltQuoteState, Token } from "@cashu/cashu-ts";

import { sumProofs } from "@cashu/cashu-ts/dist/lib/es6/utils";
import { showToast, Toast } from "@raycast/api";
import { NostrWebLNProvider } from "@getalby/sdk/dist/webln";
import Style = Toast.Style;
import { Invoice } from "@getalby/lightning-tools";

let nwc: NostrWebLNProvider;
let mint: CashuMint;
let wallet: CashuWallet;

const requestMeltQuote = async (token: Token) => {
  if (!token?.proofs?.length || !token.mint) {
    await showToast(Style.Failure, "Invalid token");
    throw new Error("Invalid token");
  }

  await showToast(Style.Animated, "Requesting Melt Quote from Mint");
  try {
    nwc = await connectWallet();
    mint = new CashuMint(token.mint);
    wallet = new CashuWallet(mint, { unit: token.unit });

    if (!nwc) {
      throw new Error("Connection Error!");
    }

    const amount = sumProofs(token.proofs);
    const unitPrice = await getSatoshiRate(wallet);
    const satoshiAmount = Math.floor(amount * unitPrice);
    const invoice = await nwc.makeInvoice(satoshiAmount);

    console.debug("Generated Invoice:", invoice);

    const meltQuote = await wallet.createMeltQuote(invoice.paymentRequest);

    await showToast(Style.Success, "Successfully retrieved Melt Quote");
    return { meltQuote, unitPrice };
  } catch (error) {
    console.error("Error requesting Melt Quote:", error);
    await showToast(Style.Failure, "Can't request Melt Quote from Mint!");
  }
};

const meltToken = async (token: Token, amount: number) => {
  if (!token?.proofs?.length || !token.mint) {
    await showToast(Style.Failure, "Invalid token");
    throw new Error("Invalid token");
  }

  await showToast(Style.Animated, "Melting proofs");

  nwc = await connectWallet();
  mint = new CashuMint(token.mint);
  wallet = new CashuWallet(mint, { unit: token.unit });

  if (!nwc) {
    throw new Error("Connection Error!");
  }

  const invoice = await nwc.makeInvoice({ amount: amount, defaultMemo: "Cashu Token melt via Vortex" });
  const quote = await wallet.createMeltQuote(invoice.paymentRequest);

  const { send: proofsToSend } = await wallet.send(quote.amount + quote.fee_reserve, token.proofs);
  const meltProofs = await wallet.meltProofs(quote, proofsToSend);

  await showToast(Style.Success, "Melt successful");
  return meltProofs;
};

const checkMeltQuote = async (meltQuote: MeltQuoteResponse) => {
  try {
    const checkedQuote = await wallet.checkMeltQuote(meltQuote.quote);

    if (checkedQuote.error) {
      console.error("Error checking Melt Quote:", checkedQuote.error, checkedQuote.code, checkedQuote.detail);
      return;
    }

    if (checkedQuote.state === MeltQuoteState.PAID) {
      console.debug("Success! Payment preimage:", checkedQuote.payment_preimage || "No preimage available.");
    } else {
      setTimeout(() => checkMeltQuote(checkedQuote), 1000);
    }
  } catch (error) {
    console.debug("Error checking Melt Quote status:", error);
  }
};

const getSatoshiRate = async (wallet: CashuWallet) => {
  const quote = await wallet.createMintQuote(1);
  const inv = new Invoice({ pr: quote.request });
  return inv.satoshi;
};

export { checkMeltQuote, meltToken, requestMeltQuote, getSatoshiRate };
