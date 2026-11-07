import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { test } from "node:test";

// The Raycast runtime provides these modules. OTP selection does not use them.
const raycast = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@raycast/api") {
      return { url: "data:text/javascript,export const Icon = {}, Image = {}, Color = {}", shortCircuit: true };
    }
    if (specifier === "@raycast/utils") {
      return { url: "data:text/javascript,export const getAvatarIcon = {}, runAppleScript = {}", shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
const { selectOTP } = await import("../src/helpers.ts");
raycast.deregister();

const cases = [
  ["Citi: Your one-time passcode is 123456. Do not share it.", "123456"],
  ["Code 123456 for card ending in 4321.", "123456"],
  ["Use 482913. Questions? Call 1-800-950-5114.", "482913"],
  ["Your code is 123-456", "123456"],
  ["Your code is 123456 10 minutes remaining", "123456"],
  ["Your code is 123456 10 min left", "123456"],
  ["Your code is 123-456 01:59 remaining", "123456"],
  ["Use 482913 10 mins left", "482913"],
  ["Your code is 123456 10-minute validity", "123456"],
  ["Your code is 1234 5678", null],
  ["Your verification code for your account is 123456.", "123456"],
  ["Your account is 123456.", null],
  ["Questions? Call 1 800 950 5114.", null],
  ["Your code is 123456. For your card ending in 4321", "123456"],
  ["Call 800-123456. Your code is 123456. Ticket 987654321", "123456"],
  ["Ticket 987654321. Your code is 001234.", "001234"],
  ["123456789012", null],
  ["Your reference is 123456789012", null],
  ["Your code: 001234, reference 987654321.", "001234"],
  ["Your card ending in 4321 was charged.", null],
  ["Call (800) 950-5114.", null],
  ["Questions? Call 555-1234.", null],
  ["555-1234", null],
  ["Your code is 555-1234", "5551234"],
  ["Call 800.555.1234. Your code is 1234.", "1234"],
  ["987654321 is your reference. 123456 is your verification code.", "123456"],
  ["PIN: 1234. Ref: 123456789012.", "1234"],
  ["123-456", "123456"],
  ["Token 098765", "098765"],
];

for (const [message, expected] of cases) {
  test(message, () => assert.equal(selectOTP(message), expected));
}
