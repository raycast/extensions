import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseAsns, parsePid } from "../src/lib/lsappinfo.ts";

describe("lsappinfo parsers", () => {
  it("reads one, several, or no ASNs", () => {
    assert.deepEqual(parseAsns('ASN:0x0-0x21021-"Discord":\n'), ["ASN:0x0-0x21021"]);
    assert.deepEqual(parseAsns('ASN:0x0-0x58e58e-"Calculator": ASN:0x0-0x58f58f-"Calculator":'), ["ASN:0x0-0x58e58e", "ASN:0x0-0x58f58f"]);
    assert.deepEqual(parseAsns(""), []);
  });
  it("reads the pid from an info block", () => {
    assert.equal(parsePid("[ NULL ]  [ NULL ]  \n    bundleID=[ NULL ] \n    pid = 714 !cgsConnection type=[ NULL ]\n"), 714);
    assert.equal(parsePid(""), undefined);
  });
});
