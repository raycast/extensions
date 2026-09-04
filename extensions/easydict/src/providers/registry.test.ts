import { describe, expect, it, vi } from "vitest";

import {
  builtinProviderServices,
  getCombinedAvailableProviderKeys,
  getCombinedProviderOrder,
  resolveProviderServices,
} from "./registry";

const preferences = vi.hoisted(
  () =>
    new Proxy(
      { servicesOrder: "", enableLingueeDictionary: true },
      {
        get(target, property: string) {
          if (property in target) return target[property as keyof typeof target];
          if (
            property.includes("Key") ||
            property.includes("URL") ||
            property.includes("Endpoint") ||
            property.includes("AppId") ||
            property.includes("AppSecret") ||
            property.includes("AccessKey")
          )
            return "";
          if (property.includes("Model") || property.includes("Token") || property.includes("Secret")) return "";
          if (property.endsWith("Host")) return "";
          return false;
        },
      },
    ),
);

vi.mock("@raycast/api", () => ({
  AI: { Model: {} },
  Cache: class {
    get() {
      return undefined;
    }

    set() {}

    remove() {}
  },
  LocalStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
  environment: { extensionName: "easydict", isDevelopment: false, canAccess: () => true },
  getPreferenceValues: () => preferences,
}));

describe("combined provider registry", () => {
  it("derives available and default order keys from every registered built-in service", () => {
    const builtinKeys = builtinProviderServices.map((service) => service.providerKey);
    const defaultOrder = getCombinedProviderOrder([]);

    expect(new Set(getCombinedAvailableProviderKeys([]))).toEqual(new Set(builtinKeys));
    expect(new Set(defaultOrder)).toEqual(new Set(builtinKeys));
    expect(defaultOrder).toHaveLength(builtinKeys.length);
  });

  it("passes one combined order to both category resolvers", () => {
    const expectedOrder = getCombinedProviderOrder([]);
    const snapshot = resolveProviderServices({ version: 1, profiles: [] });
    const services = [...snapshot.dictionaryServices, ...snapshot.translationServices];

    expect(services.map((service) => service.order)).toEqual(
      services.map((service) => expectedOrder.indexOf(service.providerKey)),
    );
    expect(snapshot.translationServices.map((service) => service.type)).not.toEqual(
      expect.arrayContaining(["OpenAI Translate", "Gemini Translate"]),
    );
  });
});
