import { describe, expect, it } from "vitest";
import { maskText, rehydrateText, compileLiteralRule, DEFAULT_RULES, type Rule } from "../src/engine";

describe("RedactCast Engine", () => {
  it("should mask and rehydrate an email", async () => {
    const originalText = "Hello, my email is john.doe@example.com. Please reply.";
    const { maskedText, mapping } = await maskText(originalText);

    expect(maskedText).toBe("Hello, my email is [EMAIL_1]. Please reply.");
    expect(mapping["[EMAIL_1]"]).toBe("john.doe@example.com");

    const restoredText = rehydrateText(maskedText, mapping);
    expect(restoredText).toBe(originalText);
  });

  it("should mask multiple instances of the same email with the same token", async () => {
    const originalText = "Contact john@example.com or reply to john@example.com.";
    const { maskedText, mapping } = await maskText(originalText);

    expect(maskedText).toBe("Contact [EMAIL_1] or reply to [EMAIL_1].");
    expect(Object.keys(mapping).length).toBe(1);

    const restoredText = rehydrateText(maskedText, mapping);
    expect(restoredText).toBe(originalText);
  });

  it("should handle multiple different PII types", async () => {
    const originalText = "Server 192.168.1.1 crashed. Email admin@corp.com.";
    const { maskedText, mapping } = await maskText(originalText);

    expect(maskedText).toBe("Server [IP_1] crashed. Email [EMAIL_1].");

    const restoredText = rehydrateText(maskedText, mapping);
    expect(restoredText).toBe(originalText);
  });

  it("masks a team rule as a literal value", () => {
    const rules = [
      compileLiteralRule({
        id: "proj",
        value: "Project Titan",
        tokenType: "PROJECT"
      })
    ].filter((r): r is Rule => r !== null);

    const original = "Ship Project Titan by Friday. Project Titan is secret.";
    const { maskedText, mapping } = maskText(original, [...rules, ...DEFAULT_RULES]);

    expect(maskedText).toBe("Ship [PROJECT_1] by Friday. [PROJECT_1] is secret.");
    expect(mapping["[PROJECT_1]"]).toBe("Project Titan");
    expect(rehydrateText(maskedText, mapping)).toBe(original);
  });

  it("treats a ReDoS-looking team value as literal text (no backtracking)", () => {
    // Before the fix this string was compiled as a regex and hung matchAll.
    const evil = "(a+)+$";
    const rules = [compileLiteralRule({ id: "x", value: evil, tokenType: "LITERAL" })].filter(
      (r): r is Rule => r !== null
    );

    const original = `harmless ${evil} text ` + "a".repeat(40);
    const start = Date.now();
    const { maskedText, mapping } = maskText(original, rules);
    expect(Date.now() - start).toBeLessThan(1000);

    // Only the literal occurrence is masked; the run of "a" is untouched.
    expect(maskedText).toBe("harmless [LITERAL_1] text " + "a".repeat(40));
    expect(mapping["[LITERAL_1]"]).toBe(evil);
  });
});
