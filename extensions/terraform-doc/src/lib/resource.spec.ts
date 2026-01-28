import { describe, expect, it } from "vitest";
import { getResourceList } from "./resource";
import { Provider } from "./provider";
import { ProviderVersion } from "./provider-version";

describe("provider", () => {
  it("should be able to list providers", async () => {
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
    const version: ProviderVersion = {
      type: "provider-versions",
      id: "46537",
      attributes: {
        downloads: 0,
        "published-at": new Date("2022-10-16T03:02:42Z"),
        tag: "v1.188.0",
        version: "1.188.0",
      },
    };
    const res = await getResourceList(provider, version);
    expect(res?.length).toBeGreaterThan(0);
  });
});
