/**
 * When the Generate command mentions the month's private card allowance.
 *
 * Unlike most of its neighbours here this spec needs no backend: exhausting a
 * real allowance takes fifty cards the database would have to generate, and
 * the decision worth pinning down is the one this client makes on the number
 * the database hands it — whether the tally is worth saying at all. Refusing
 * a card is the trigger's job, as it is in the web app and the AI connector.
 */

import { describe, expect, it } from "vitest";
import { describeLowAllowance } from "../../src/lib/private-card-quota";

describe("saying how much of the allowance is left", () => {
  it("says nothing while the tally carries no decision", () => {
    expect(describeLowAllowance(50)).toBeNull();
    expect(describeLowAllowance(6)).toBeNull();
  });

  it("speaks up once the next card may be refused", () => {
    expect(describeLowAllowance(5)).toBe("Only 5 cards left this month.");
    expect(describeLowAllowance(1)).toBe("Only 1 card left this month.");
  });

  it("says when there is nothing left, and when that will change", () => {
    expect(describeLowAllowance(0)).toBe("No cards left this month. The allowance resets on the 1st.");
  });

  it("says nothing at all when the allowance could not be read", () => {
    expect(describeLowAllowance(null)).toBeNull();
  });
});
