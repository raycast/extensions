import { services } from "../../services/registry";

describe("service registry", () => {
  it("contains exactly 5 services", () => {
    expect(services).toHaveLength(5);
  });

  it("all services have required fields", () => {
    for (const service of services) {
      expect(typeof service.id).toBe("string");
      expect(typeof service.name).toBe("string");
      expect(typeof service.endpoint).toBe("string");
      expect(typeof service.icon).toBe("string");
      expect(typeof service.requiresApiKey).toBe("boolean");
    }
  });

  it("bit.ly has requiresApiKey=true with apiKeyPreferenceName set", () => {
    const bitly = services.find((s) => s.id === "bitly");
    expect(bitly?.requiresApiKey).toBe(true);
    expect(bitly?.apiKeyPreferenceName).toBe("bitlyApiKey");
  });

  it("cutt.ly has requiresApiKey=true with apiKeyPreferenceName set", () => {
    const cuttly = services.find((s) => s.id === "cuttly");
    expect(cuttly?.requiresApiKey).toBe(true);
    expect(cuttly?.apiKeyPreferenceName).toBe("cuttlyApiKey");
  });

  it("tinyurl has requiresApiKey=false", () => {
    const tinyurl = services.find((s) => s.id === "tinyurl");
    expect(tinyurl?.requiresApiKey).toBe(false);
  });

  it("is.gd has requiresApiKey=false", () => {
    const isgd = services.find((s) => s.id === "isgd");
    expect(isgd?.requiresApiKey).toBe(false);
  });

  it("v.gd has requiresApiKey=false", () => {
    const vgd = services.find((s) => s.id === "vgd");
    expect(vgd?.requiresApiKey).toBe(false);
  });

  it("each service has a unique id", () => {
    const ids = services.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("icon filenames are non-empty strings", () => {
    for (const service of services) {
      expect(service.icon.length).toBeGreaterThan(0);
    }
  });
});
