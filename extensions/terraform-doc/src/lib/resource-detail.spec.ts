import { describe, expect, it } from "vitest";
import { parseRawDoc } from "./resource-detail";
import fetch from "node-fetch";

describe("Resource Details", () => {
  it("should parse", async () => {
    const markdown = await (
      await fetch(
        "https://raw.githubusercontent.com/hashicorp/terraform-provider-google/v5.9.0/website/docs/r/network_security_url_lists.html.markdown",
      )
    ).text();
    const result = parseRawDoc(markdown);
    expect(result.length).toBeGreaterThan(0);
  });
});
