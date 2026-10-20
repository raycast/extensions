import { getNamedPorts } from "../hooks/useNamedPorts";

/** List every saved port name from the Named Ports command. */
export default function tool() {
  const namedPorts = Object.entries(getNamedPorts()).map(([port, info]) => ({ port: Number(port), name: info.name }));
  return namedPorts.length > 0 ? JSON.stringify(namedPorts) : "No named ports have been saved.";
}
