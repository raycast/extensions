import type { WalletResult } from "./types";

export function buildItemTemplate(result: WalletResult, title: string) {
  const recoverySection = { id: "recovery", label: "Recovery" };
  const addressesSection = { id: "addresses", label: "Public Addresses" };
  const derivationSection = { id: "derivation", label: "Derivation Details" };

  return {
    title,
    // This exact pair is returned by `op item template get "Crypto Wallet"`.
    // The CLI rejects `CRYPTO_WALLET` as a JSON template category.
    category: "CUSTOM",
    category_id: "115",
    sections: [recoverySection, addressesSection, derivationSection],
    fields: [
      {
        id: "recoveryPhrase",
        section: recoverySection,
        type: "CONCEALED",
        label: "Recovery Phrase",
        value: result.mnemonic,
      },
      {
        id: "evmAddress",
        section: addressesSection,
        type: "STRING",
        label: "EVM Address",
        value: result.chains.evm.address,
      },
      {
        id: "btcAddress",
        section: addressesSection,
        type: "STRING",
        label: "Bitcoin Address",
        value: result.chains.btc.address,
      },
      {
        id: "solAddress",
        section: addressesSection,
        type: "STRING",
        label: "Solana Address",
        value: result.chains.sol.address,
      },
      {
        id: "evmPath",
        section: derivationSection,
        type: "STRING",
        label: "EVM Path",
        value: result.chains.evm.path,
      },
      {
        id: "btcPath",
        section: derivationSection,
        type: "STRING",
        label: "Bitcoin Path",
        value: result.chains.btc.path,
      },
      {
        id: "btcType",
        section: derivationSection,
        type: "STRING",
        label: "Bitcoin Type",
        value: result.chains.btc.type,
      },
      {
        id: "solPath",
        section: derivationSection,
        type: "STRING",
        label: "Solana Path",
        value: result.chains.sol.path,
      },
    ],
  };
}
