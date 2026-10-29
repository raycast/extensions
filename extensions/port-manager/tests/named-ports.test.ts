import { describe, expect, it } from "vitest";
import { cache } from "./setup";
import { getNamedPorts } from "../src/hooks/useNamedPorts";
import { isValidPort, removeNamedPort, saveNamedPort } from "../src/utilities/namedPortStore";
import create from "../src/tools/create-named-port";
import update from "../src/tools/update-named-port";
import remove, { confirmation } from "../src/tools/delete-named-port";
import list from "../src/tools/list-named-ports";

describe("named port storage and tools", () => {
  it.each([0, 1, 65535])("accepts boundary port %s", (port) => {
    expect(isValidPort(port)).toBe(true);
  });
  it.each([-1, 65536, 1.5, NaN, Infinity])("rejects invalid port %s without writing", (port) => {
    expect(isValidPort(port)).toBe(false);
    expect(saveNamedPort(port, "Dev", "create")).toContain("integer between 0 and 65535");
    expect(removeNamedPort(port)).toContain("integer between 0 and 65535");
    expect(cache.size).toBe(0);
  });
  it("creates, lists, updates, and deletes names without changing other ports", async () => {
    expect(getNamedPorts()).toEqual({});
    expect(list()).toBe("No named ports have been saved.");
    expect(create({ port: 3000, name: "  Dev  " })).toBe('Named port 3000 as "Dev".');
    create({ port: 80, name: "HTTP" });
    expect(JSON.parse(list())).toEqual([
      { port: 80, name: "HTTP" },
      { port: 3000, name: "Dev" },
    ]);
    expect(update({ port: 3000, name: " API " })).toBe('Updated port 3000 as "API".');
    expect(await confirmation({ port: 3000 })).toEqual({
      style: "destructive",
      message: "Delete the saved name for port 3000?",
    });
    expect(remove({ port: 3000 })).toBe("Removed the saved name for port 3000.");
    expect(getNamedPorts()).toEqual({ 80: { name: "HTTP" } });
  });
  it("rejects blank names, duplicate creation, and missing updates/deletions", () => {
    expect(create({ port: 3000, name: " \t " })).toBe("The name cannot be empty.");
    expect(update({ port: 3000, name: "Dev" })).toBe("Port 3000 has no saved name.");
    expect(remove({ port: 3000 })).toBe("Port 3000 has no saved name.");
    create({ port: 3000, name: "Original" });
    expect(create({ port: 3000, name: "Replacement" })).toBe("Port 3000 already has a name.");
    expect(getNamedPorts()).toEqual({ 3000: { name: "Original" } });
  });
});
