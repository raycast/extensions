import assert from "node:assert/strict";
import test from "node:test";
import { createDeviceStore, type DeviceStorage } from "../src/lib/device-store";
import type { RokuDevice } from "../src/lib/types";

class MemoryStorage implements DeviceStorage {
  items: Record<string, unknown> = {};
  beforeWrite?: (key: string) => Promise<void>;
  async allItems() {
    return { ...this.items };
  }
  async getItem(key: string) {
    return this.items[key];
  }
  async setItem(key: string, value: string) {
    await this.beforeWrite?.(key);
    this.items[key] = value;
  }
  async removeItem(key: string) {
    delete this.items[key];
  }
}

const a: RokuDevice = { id: "A", name: "TV A", host: "192.168.1.10", capabilities: { power: true, volume: true } };
const b: RokuDevice = { id: "B", name: "TV B", host: "192.168.1.11", capabilities: {} };

test("a delayed metadata write cannot revert a concurrent alias or default-TV selection", async () => {
  const storage = new MemoryStorage();
  const background = createDeviceStore(storage);
  const foreground = createDeviceStore(storage);
  await background.saveDevices([a, b]);
  await foreground.selectDevice(a.id);
  let release!: () => void;
  let entered!: () => void;
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  storage.beforeWrite = async (key) => {
    if (key.includes(".device.")) {
      entered();
      await blocked;
    }
  };
  const refresh = background.updateDevice({ ...a, host: "192.168.1.99", name: "Name from TV" });
  await started;
  await foreground.renameDevice(a.id, "My Bedroom");
  await foreground.selectDevice(b.id);
  release();
  await refresh;
  assert.equal((await foreground.getSelectedDevice())?.id, b.id);
  const saved = (await foreground.getSavedDevices()).find((device) => device.id === a.id);
  assert.equal(saved?.name, "My Bedroom");
  assert.equal(saved?.host, "192.168.1.99");
});

test("concurrent saves of different TVs retain both records and never invent a default", async () => {
  const storage = new MemoryStorage();
  const one = createDeviceStore(storage);
  const two = createDeviceStore(storage);
  await Promise.all([one.saveDevices([a]), two.saveDevices([b])]);
  assert.deepEqual(
    (await one.getSavedDevices()).map((device) => device.id),
    [a.id, b.id],
  );
  assert.equal(await one.getSelectedDevice(), undefined);
});

test("removing the selected TV leaves no default and re-adding it does not restore stale choices", async () => {
  const storage = new MemoryStorage();
  const store = createDeviceStore(storage);
  await store.saveDevices([a, b]);
  await store.selectDevice(a.id);
  await store.renameDevice(a.id, "Old name");
  await store.removeDevice(a.id);
  assert.equal(await store.getSelectedDevice(), undefined);
  await store.saveDevices([a]);
  assert.equal(await store.getSelectedDevice(), undefined);
  assert.equal((await store.getSavedDevices()).find((device) => device.id === a.id)?.name, a.name);
  await store.selectDevice(a.id);
  assert.equal((await store.getSelectedDevice())?.id, a.id);
});

test("corrupt records are skipped, do not break other TVs, and can be replaced or removed", async () => {
  const storage = new MemoryStorage();
  const store = createDeviceStore(storage);
  await store.saveDevices([a, b]);
  await store.selectDevice(a.id);
  const key = Object.keys(storage.items).find(
    (key) => key.includes(".device.") && String(storage.items[key]).includes('"id":"A"'),
  )!;
  storage.items[key] = "{broken";
  storage.items["roku-direct.v2.device.bad"] = JSON.stringify({
    version: 1,
    generation: "x",
    device: { ...a, capabilities: null },
  });
  storage.items["roku-direct.devices.v1"] = "legacy invalid envelope";
  assert.deepEqual(
    (await store.getSavedDevices()).map((device) => device.id),
    [b.id],
  );
  assert.equal(await store.getSelectedDevice(), undefined);
  await store.saveDevices([a]);
  assert.equal((await store.getSavedDevices()).length, 2);
  assert.equal(await store.getSelectedDevice(), undefined);
  await store.removeDevice(a.id);
  assert.equal(storage.items[key], undefined);
});

test("invalid data is rejected before a batch write and a failed write does not poison later operations", async () => {
  const storage = new MemoryStorage();
  const store = createDeviceStore(storage);
  await assert.rejects(store.saveDevices([a, { ...b, host: "http://bad.example/" }]), /invalid device information/);
  assert.deepEqual(await store.getSavedDevices(), []);
  storage.beforeWrite = async () => {
    throw new Error("Disk unavailable");
  };
  await assert.rejects(store.saveDevices([a]), /Disk unavailable/);
  storage.beforeWrite = undefined;
  await store.saveDevices([a]);
  await assert.rejects(store.renameDevice(a.id, "  "), /Enter a name/);
  await store.selectDevice(a.id);
  assert.equal((await store.getSelectedDevice())?.id, a.id);
});
