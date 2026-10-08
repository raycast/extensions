import { beforeEach, expect, it, vi } from "vitest";
import { __resetCache } from "../helpers/raycast-stub";

const walk = vi.hoisted(() => vi.fn());
const catchUp = vi.hoisted(() => vi.fn());
vi.mock("../../src/api/Server", () => ({ Server: { walk, catchUp } }));

import { forgetServers, loadServers } from "../../src/hooks/useServers";

const FLEET = [{ id: 1, name: "web-1" }];
const TAIL = { "acct/kevin-batdorf": { cursor: "cur-1", ids: [9001, 9002] } };

beforeEach(() => {
  __resetCache();
  walk.mockReset().mockResolvedValue({ servers: FLEET, tail: TAIL });
  catchUp.mockReset().mockResolvedValue({ servers: FLEET, tail: TAIL });
});

it("walks once, then only catches up", async () => {
  expect(await loadServers()).toEqual(FLEET);
  expect(await loadServers()).toEqual(FLEET);
  expect(walk).toHaveBeenCalledTimes(1);
  expect(catchUp).toHaveBeenCalledWith(FLEET, TAIL);
});

it("keeps what catching up returns without walking again", async () => {
  await loadServers();
  const grown = [...FLEET, { id: 2, name: "web-2" }];
  catchUp.mockResolvedValue({ servers: grown, tail: TAIL });
  expect(await loadServers()).toEqual(grown);
  expect(walk).toHaveBeenCalledTimes(1);
});

it("walks when catching up says the cache cannot carry forward", async () => {
  await loadServers();
  catchUp.mockResolvedValue(null);
  await loadServers();
  expect(walk).toHaveBeenCalledTimes(2);
});

it("walks after the hover check empties the cache", async () => {
  await loadServers();
  forgetServers();
  await loadServers();
  expect(walk).toHaveBeenCalledTimes(2);
  expect(catchUp).not.toHaveBeenCalled();
});

it("walks rather than trusting a list it cannot check", async () => {
  await loadServers();
  catchUp.mockRejectedValue(new Error("offline"));
  await loadServers();
  expect(walk).toHaveBeenCalledTimes(2);
});
