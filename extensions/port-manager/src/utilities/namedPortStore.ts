import { Cache } from "@raycast/api";
import { getNamedPorts } from "../hooks/useNamedPorts";

const cache = new Cache();
const key = "named-ports";

export function isValidPort(port: number) {
  return Number.isInteger(port) && port >= 0 && port <= 65535;
}

export function saveNamedPort(port: number, name: string, mode: "create" | "update") {
  if (!isValidPort(port)) return "The port must be an integer between 0 and 65535.";
  const trimmedName = name.trim();
  if (trimmedName.length === 0) return "The name cannot be empty.";

  const namedPorts = getNamedPorts();
  if (mode === "create" && namedPorts[port] !== undefined) return `Port ${port} already has a name.`;
  if (mode === "update" && namedPorts[port] === undefined) return `Port ${port} has no saved name.`;

  cache.set(key, JSON.stringify({ ...namedPorts, [port]: { name: trimmedName } }));
  return `${mode === "create" ? "Named" : "Updated"} port ${port} as "${trimmedName}".`;
}

export function removeNamedPort(port: number) {
  if (!isValidPort(port)) return "The port must be an integer between 0 and 65535.";

  const namedPorts = getNamedPorts();
  if (namedPorts[port] === undefined) return `Port ${port} has no saved name.`;

  delete namedPorts[port];
  cache.set(key, JSON.stringify(namedPorts));
  return `Removed the saved name for port ${port}.`;
}
