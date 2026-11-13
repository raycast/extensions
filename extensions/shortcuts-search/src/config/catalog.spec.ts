jest.mock("@raycast/api", () => ({ environment: { isDevelopment: false } }), { virtual: true });
import { resolveCatalogOrigin } from "./catalog";
it("defaults to the public catalog and restricts overrides to development", () => {
  expect(resolveCatalogOrigin(false)).toBe("https://hotkys.com");
  expect(resolveCatalogOrigin(true, "http://localhost:3000")).toBe("http://localhost:3000");
  expect(() => resolveCatalogOrigin(false, "http://localhost:3000")).toThrow("development");
  expect(() => resolveCatalogOrigin(true, "https://user:pass@example.com")).toThrow("origin");
});
