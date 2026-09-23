import assert from "node:assert/strict";
import test from "node:test";
import { PrivateKey } from "@bsv/sdk";
import {
  addressFromPublicKeyHash,
  addressFromWif,
  decodeTransaction,
  generateAddress,
  generateWif,
  generateXpriv,
  generateXpub,
  p2pkhScriptFromAddress,
} from "../src/lib/bitcoin.ts";

const KNOWN_WIF = "L5EY1SbTvvPNSdCYQe1EJHfXCBBT4PmnF6CDbzCm9iifZptUvDGB";
const KNOWN_ADDRESS = "1GkX2sho46Ac8W2ZPFcCQ3LX1LKnUyQ3pN";
const KNOWN_PUBLIC_KEY_HASH = "acc4d7c37bc9d0be0a4987483058a2d842f2265d";
const RAW_TRANSACTION =
  "000000000100000000000000000000000000000000000000000000000000000000000000000000000001ae0000000001050000000000000001ae00000000";

test("converts a known mainnet WIF to its address", () => {
  assert.deepEqual(addressFromWif(`  ${KNOWN_WIF}  `), {
    address: KNOWN_ADDRESS,
    network: "mainnet",
  });
});

test("preserves the network encoded in a testnet WIF", () => {
  const privateKey = PrivateKey.fromWif(KNOWN_WIF);
  const testnetWif = privateKey.toWif([0xef]);

  assert.deepEqual(addressFromWif(testnetWif), {
    address: privateKey.toAddress("testnet"),
    network: "testnet",
  });
});

test("rejects WIF values with an unsupported prefix", () => {
  const unsupportedWif = PrivateKey.fromWif(KNOWN_WIF).toWif([0x81]);
  assert.throws(
    () => addressFromWif(unsupportedWif),
    /mainnet or testnet prefix/,
  );
});

test("converts a 20-byte public key hash to a mainnet address", () => {
  assert.equal(addressFromPublicKeyHash(KNOWN_PUBLIC_KEY_HASH), KNOWN_ADDRESS);
  assert.equal(
    addressFromPublicKeyHash(`0x${KNOWN_PUBLIC_KEY_HASH.toUpperCase()}`),
    KNOWN_ADDRESS,
  );
  assert.throws(() => addressFromPublicKeyHash("abcd"), /exactly 20 bytes/);
});

test("creates canonical P2PKH scripts in ASM and hex", () => {
  assert.deepEqual(p2pkhScriptFromAddress(KNOWN_ADDRESS), {
    asm: `OP_DUP OP_HASH160 ${KNOWN_PUBLIC_KEY_HASH} OP_EQUALVERIFY OP_CHECKSIG`,
    hex: `76a914${KNOWN_PUBLIC_KEY_HASH}88ac`,
  });
  assert.throws(() => p2pkhScriptFromAddress("not-an-address"));
});

test("generates valid SDK-backed address and key formats", () => {
  const address = generateAddress();
  const wif = generateWif();
  const xpriv = generateXpriv();
  const xpub = generateXpub();

  assert.match(address, /^1[1-9A-HJ-NP-Za-km-z]{25,34}$/);
  assert.equal(addressFromWif(wif).network, "mainnet");
  assert.match(xpriv, /^xprv[1-9A-HJ-NP-Za-km-z]+$/);
  assert.match(xpub, /^xpub[1-9A-HJ-NP-Za-km-z]+$/);
});

test("decodes and summarizes a canonical raw transaction", () => {
  const decoded = decodeTransaction(RAW_TRANSACTION);

  assert.equal(decoded.version, 0);
  assert.equal(decoded.sizeBytes, RAW_TRANSACTION.length / 2);
  assert.equal(decoded.inputs.length, 1);
  assert.equal(decoded.inputs[0]?.sourceOutputIndex, 0);
  assert.equal(decoded.inputs[0]?.unlockingScriptAsm, "OP_CHECKMULTISIG");
  assert.equal(decoded.outputs.length, 1);
  assert.equal(decoded.outputs[0]?.satoshis, 5);
  assert.equal(decoded.outputs[0]?.lockingScriptAsm, "OP_CHECKMULTISIG");
  assert.equal(decoded.totalOutputSatoshis, 5);
  assert.match(decoded.transactionId, /^[0-9a-f]{64}$/);
});

test("rejects malformed and trailing transaction data", () => {
  assert.throws(() => decodeTransaction("not hex"), /hexadecimal/);
  assert.throws(
    () => decodeTransaction(`${RAW_TRANSACTION}00`),
    /trailing or non-canonical/,
  );
});
