import { describe, expect, it } from "vitest";
import { renderGroundPacketMarkdown } from "../src/domain/markdown";
import { createGroundPacket, draftFromInput } from "../src/domain/packet";

describe("portable markdown", () => {
  it("discloses compatibility and authority boundaries", () => {
    const record = createGroundPacket(
      draftFromInput({
        title: "Release handoff",
        situation: "A release is ready.",
        evidence: ["Build passed || CI run 44"],
      }),
    );
    const markdown = renderGroundPacketMarkdown(record);
    expect(markdown).toContain("# Release handoff");
    expect(markdown).toContain("candidate-compatible-not-admitted");
    expect(markdown).toContain("does not mean admission, verification, authority, or onboarding");
  });
});
