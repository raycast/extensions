import { localUrl } from "./protocol.js";
export type SetupMode = "local" | "existing" | "mac-reverse" | "remote-local" | "server-forward";
export const setupModes: Record<
  SetupMode,
  {
    title: string;
    description: string;
    agentUrl: string;
    runOn: string;
  }
> = {
  local: {
    title: "Agent on this Mac",
    description: "Use the same bridge directly. No SSH tunnel is needed.",
    agentUrl: "http://127.0.0.1:48123",
    runOn: "No tunnel needed",
  },
  existing: {
    title: "I already have a working connection",
    description: "Keep your existing tunnel or loopback proxy. Supply the address as seen by the Agent.",
    agentUrl: "http://127.0.0.1:49123",
    runOn: "Use your existing transport",
  },
  "mac-reverse": {
    title: "Mac bridge · Mac connects to server",
    description: "Open a remote listener with SSH -R. The Agent reaches the bridge on your Mac.",
    agentUrl: "http://127.0.0.1:49123",
    runOn: "Run on your Mac",
  },
  "remote-local": {
    title: "Mac bridge · Server connects to Mac",
    description: "Open a local listener on the server with SSH -L. The server needs SSH access to your Mac.",
    agentUrl: "http://127.0.0.1:49123",
    runOn: "Run on the Agent server",
  },
  "server-forward": {
    title: "Server bridge · Mac connects to server",
    description: "Keep the bridge with your Agents. SSH -L exposes it locally to Raycast.",
    agentUrl: "http://127.0.0.1:48123",
    runOn: "Run on your Mac",
  },
};
export function tunnelCommand(
  mode: SetupMode,
  target: string,
  agentUrl: string,
  bridgeUrl: string,
  macUrl: string,
): string | undefined {
  const agent = localUrl(agentUrl),
    bridge = localUrl(bridgeUrl),
    mac = localUrl(macUrl);
  if (mode === "local" || mode === "existing") return undefined;
  if (!/^(?:[A-Za-z0-9_][A-Za-z0-9_.-]*@)?[A-Za-z0-9_][A-Za-z0-9_.-]*$/.test(target))
    throw new Error("Use an SSH alias or user@host. Put ports, keys and jump hosts in SSH config.");
  const listen = mode === "server-forward" ? mac : agent;
  return `ssh -N -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 -o ServerAliveCountMax=3 ${mode === "mac-reverse" ? "-R" : "-L"} 127.0.0.1:${listen.port || 80}:${bridge.hostname}:${bridge.port || 80} -- ${target}`;
}
export function setupAddress(mode: SetupMode, currentAddress?: string): string {
  return mode === "local" ? (currentAddress ?? setupModes.local.agentUrl) : setupModes[mode].agentUrl;
}
// Bundled so setup works before publishing new docs, and while GitHub is offline.
export const setupGuide = `# Connect the Agent you already use

**Bridge running and Raycast connected?** Choose the Agent's location in Connection Setup, create a private pairing prompt, and give it to your existing Claude session. Keep your current tunnel. No restart or new model is needed.

**Raycast cannot connect?** Use an Existing Bridge with a private configuration file on this Mac. Set Address From This Mac to its loopback endpoint. Test and Use Connection authenticates before switching. Tokens stay in that file, not preferences or Agent chat.

## No bridge yet

On the chosen bridge machine, use an existing Argo checkout:

\`\`\`sh
npm ci
npm run build
node bin/argo.mjs serve --port 48123
\`\`\`

Or download and inspect the pinned public installer using the installation instructions below. After installation, run its returned absolute launcher with serve. Do not claim an Agent code just to start a bridge. Installation starts no service automatically. Keep the bridge running.

Prerequisites: Node.js 22.13+, npm, tar and HTTPS access to GitHub and the npm registry. Credentials are created in the bridge host's private Argo home.

## Which tunnel, and where?

Both SSH directions carry replies on the same bidirectional connection. Port numbers may differ. These are examples, never executed by the extension. Replace SSH destinations with your authorized alias.

**Everything on this Mac:** no tunnel. Raycast and Agent both use http://127.0.0.1:48123.

**Mac bridge, Mac opens SSH to server:** run on Mac:

\`\`\`sh
ssh -N -o ExitOnForwardFailure=yes -R 127.0.0.1:49123:127.0.0.1:48123 -- user@server
\`\`\`

Raycast uses port 48123. The server Agent uses port 49123.

**Mac bridge, server opens SSH to Mac:** run on server, only if authorized Mac SSH access already exists:

\`\`\`sh
ssh -N -o ExitOnForwardFailure=yes -L 127.0.0.1:49123:127.0.0.1:48123 -- user@mac
\`\`\`

Raycast uses port 48123. The server Agent uses port 49123. Argo does not enable Mac Remote Login.

**Server bridge, Mac opens SSH to server:** run on Mac:

\`\`\`sh
ssh -N -o ExitOnForwardFailure=yes -L 127.0.0.1:49124:127.0.0.1:48123 -- user@server
\`\`\`

Raycast uses port 49124. An Agent on the bridge server uses port 48123. An Agent on the Mac uses port 49124.

Keep listeners loopback-only. SSH servers must allow forwarding without forcing a public listener. Argo does not alter SSH config or bypass host-key checks.

## Import a server bridge on this Mac

Raycast needs that same bridge's admin credential. Do not create an unrelated Mac bridge or send admin credentials to the Agent. Using a built checkout on the bridge server:

\`\`\`sh
node bin/argo.mjs export-client --out /NEW/private/mac-client.json --url http://127.0.0.1:49124
\`\`\`

The output file grants access to all bindings. Transfer it privately using SCP to a new private directory on this Mac, preserve mode 600, and select its file path in Use an Existing Bridge. Never read or paste its contents into chat. The source config is unchanged. This command is included in the pinned v0.1.4 runtime.

## Diagnose without exposing credentials

\`\`\`sh
node bin/argo.mjs doctor
node bin/argo.mjs doctor --url http://127.0.0.1:49123
\`\`\`

The explicit URL probe sends no admin token. HTTP 401 proves an HTTP service answered, not that it is the correct Argo bridge. Authenticated doctor reports only counts and statuses. Diagnostics are included in the pinned runtime, not a model round-trip.

## Agent and permission boundaries

Claude cooperative pull occupies the current Agent turn. Existing background work continues. Tool approvals stay in the original terminal. Delivery pauses when the Agent leaves its receive/reply loop. Raycast cannot wake an ordinary completed prompt automatically.

Codex is experimental. It needs the existing shared App Server and exact loaded thread. A real populated native Codex rejoin is not verified. Other Agents need their own adapter; an open port alone is not enough.

GitHub distributes public code only. Pairing codes expire and authorize one binding. Use a fresh prompt after expiration. Unknown delivery is never automatically replayed. Removing a saved bridge reference never stops its Agents.
`;
