import { vi } from "vitest";

vi.mock("@raycast/api", () => {
  const Icon = new Proxy(
    {},
    {
      get: (_target, property) => String(property),
    },
  );

  return {
    Icon,
    open: vi.fn(),
    showHUD: vi.fn(),
    getApplications: vi.fn(),
  };
});
