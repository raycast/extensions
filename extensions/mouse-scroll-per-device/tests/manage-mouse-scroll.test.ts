import assert from "node:assert/strict";
import test from "node:test";
import { ManageMouseScroll } from "../src/application/manage-mouse-scroll";
import { HelperStatus, MouseDevice, ProfileDocument } from "../src/domain/models";

const stableMouse: MouseDevice = {
  key: "0001:0002:serial:a",
  profileKey: "0001:0002:serial:a",
  identityState: "stable",
  name: "Mouse",
  vendorID: 1,
  productID: 2,
  serialNumber: "a",
};

const helper: HelperStatus = {
  state: "stopped",
  permissions: { inputMonitoring: "notDetermined", accessibility: "notDetermined" },
};

function subject(document: ProfileDocument = { version: 1, profiles: {} }) {
  let saved: ProfileDocument | undefined;
  const useCase = new ManageMouseScroll(
    {
      async list() {
        return { status: "succeeded" as const, value: [stableMouse] };
      },
    },
    {
      async load() {
        return { status: "succeeded" as const, value: document };
      },
      async save(next) {
        saved = next;
        return { status: "succeeded" as const, value: undefined };
      },
    },
    {
      async status() {
        return { status: "succeeded" as const, value: helper };
      },
      async install() {
        return { status: "succeeded" as const, value: helper };
      },
      async repair() {
        return { status: "succeeded" as const, value: helper };
      },
      async start() {
        return { status: "succeeded" as const, value: helper };
      },
      async stop() {
        return { status: "succeeded" as const, value: helper };
      },
      async requestPermissions() {
        return { status: "succeeded" as const, value: helper };
      },
      async openInputMonitoringSettings() {
        return { status: "succeeded" as const, value: undefined };
      },
      async openAccessibilitySettings() {
        return { status: "succeeded" as const, value: undefined };
      },
    },
  );
  return { useCase, saved: () => saved };
}

test("loads a stable device with an independent default profile", async () => {
  const { useCase } = subject();
  const result = await useCase.load();
  assert.equal(result.status, "succeeded");
  if (result.status === "succeeded") assert.equal(result.value.devices[0].profile.verticalMultiplier, 1);
});

test("saves only under the stable profile key", async () => {
  const fixture = subject();
  const result = await fixture.useCase.save(stableMouse, {
    name: "Mouse",
    reverseVertical: true,
    reverseHorizontal: false,
    verticalMultiplier: 2,
    horizontalMultiplier: 1,
  });
  assert.equal(result.status, "succeeded");
  assert.equal(fixture.saved()?.profiles[stableMouse.profileKey ?? ""].verticalMultiplier, 2);
});

test("rejects ambiguous identities rather than silently sharing a profile", async () => {
  const fixture = subject();
  const result = await fixture.useCase.save(
    { ...stableMouse, key: "ambiguous:0001:0002:registry:1", profileKey: undefined, identityState: "ambiguous" },
    { name: "Mouse", reverseVertical: false, reverseHorizontal: false, verticalMultiplier: 1, horizontalMultiplier: 1 },
  );
  assert.equal(result.status, "unavailable");
  assert.equal(fixture.saved(), undefined);
});

test("rejects non-finite profile values before persistence", async () => {
  const fixture = subject();
  const result = await fixture.useCase.save(stableMouse, {
    name: "Mouse",
    reverseVertical: false,
    reverseHorizontal: false,
    verticalMultiplier: Number.NaN,
    horizontalMultiplier: 1,
  });
  assert.equal(result.status, "failed");
  assert.equal(fixture.saved(), undefined);
});
