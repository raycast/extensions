import { describe, expect, it } from "vitest";
import { Provider } from "./provider";
import { getProviderVersionList } from "./provider-version";

describe("provider", () => {
  it("should be able to list versions", async () => {
    const provider: Provider = {
      type: "providers",
      id: "690",
      attributes: {
        downloads: 8586414,
        "full-name": "aliyun/alicloud",
        "logo-url": "https://avatars3.githubusercontent.com/aliyun",
        name: "alicloud",
        namespace: "aliyun",
        "robots-noindex": false,
        source: "https://github.com/aliyun/terraform-provider-alicloud",
        tier: "partner",
        warning: "",
      },
    };
    const res = await getProviderVersionList(provider);
    expect(res.length).toBeGreaterThan(0);
  });
});
