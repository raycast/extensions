import { describe, expect, it } from "vitest";

import { replacementListRow } from "../src/lib/replacement-list-row";

describe("replacementListRow", () => {
  it("formats enabled replacements as status, trigger, replacement text, and tag columns", () => {
    expect(
      replacementListRow(
        {
          uuid: "uuid-scrolling",
          trigger: "_scrolling_youtube",
          replacementText: "I'm just scrolling through YouTube and Grindr looking for something to keep me occupied.",
          tags: ["grindr"],
          enabled: true,
        },
        { grindr: "Yellow" },
      ),
    ).toEqual({
      status: "enabled",
      trigger: "_scrolling_youtube",
      replacementText: "I'm just scrolling through YouTube and Grindr looking for something to keep me occupied.",
      keywords: ["I'm just scrolling through YouTube and Grindr looking for something to keep me occupied.", "grindr"],
      tags: [{ name: "grindr", color: "Yellow" }],
    });
  });

  it("formats disabled replacements with a muted x status and no-tag placeholder", () => {
    expect(
      replacementListRow({
        uuid: "uuid-disabled",
        trigger: "off",
        replacementText: "Disabled replacement",
        tags: [],
        enabled: false,
      }),
    ).toMatchObject({
      status: "disabled",
      tags: [],
    });
  });
});
