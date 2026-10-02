import test from "node:test";
import assert from "node:assert/strict";
import { applyRefreshedCodes, TotpItem } from "./totp-codes";

function item(itemId: string, currentTotp?: string, codeStep?: number): TotpItem {
  return {
    shareId: "vault",
    itemId,
    title: itemId,
    type: "login",
    vaultName: "Personal",
    hasTotp: true,
    currentTotp,
    codeStep,
  };
}

test("refreshed codes never bring back items a newer load removed", () => {
  const shown = [item("kept", "111111", 10), item("added", "222222", 10)];
  const refreshed = [item("kept", "333333", 10), item("removed", "444444", 10)];

  assert.deepEqual(
    applyRefreshedCodes(shown, refreshed, 10).map(({ itemId, currentTotp }) => [itemId, currentTotp]),
    [
      ["kept", "333333"],
      ["added", "222222"],
    ],
  );
});

test("a code asked for later wins", () => {
  const shown = [item("a", "111111", 11)];
  assert.equal(applyRefreshedCodes(shown, [item("a", "000000", 10)], 11)[0].currentTotp, "111111");
  assert.equal(applyRefreshedCodes(shown, [item("a", "222222", 11)], 11)[0].currentTotp, "222222");
});

test("without a newer code, the one shown stays only during its step", () => {
  const shown = [item("a", "111111", 10)];
  const failed = [item("a")];

  assert.equal(applyRefreshedCodes(shown, failed, 10)[0].currentTotp, "111111");
  assert.deepEqual(applyRefreshedCodes(shown, failed, 11)[0], item("a"));
});
