import { join } from "path";
import { describe, expect, it } from "vitest";
import { Dictionaries } from "../src/lib/dictionaries";
import { Finglish } from "../src/lib/finglish";

const finglish = new Finglish(Dictionaries.load(join(__dirname, "..", "assets")));

describe("finglish", () => {
  it("converts common words", () => {
    expect(finglish.convert("salam khobi?")).toBe("سلام خوبی؟");
    expect(finglish.convert("merci")).toBe("مرسی");
    expect(finglish.convert("ketab")).toBe("کتاب");
    expect(finglish.convert("man mikham beram khune")).toMatch(/^من میخوام بر(ا)?م خونه$/);
  });

  it("falls back to a letter-by-letter reading", () => {
    expect(finglish.convert("zzqx")).not.toMatch(/[a-z]/);
  });

  it("keeps Persian text and numbers", () => {
    expect(finglish.convert("سلام 123")).toBe("سلام 123");
  });
});
