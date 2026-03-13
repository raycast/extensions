import { run, runSync, which } from "./exec";

type TailscaleStatus = {
  Self?: {
    DNSName?: string;
  };
};

export function isTailscaleInstalled(): boolean {
  return which("tailscale");
}

export function isTailscaleConnected(): boolean {
  try {
    runSync("tailscale status");
    return true;
  } catch {
    return false;
  }
}

export async function getDnsName(): Promise<string | null> {
  try {
    const { stdout } = await run("tailscale status --json");
    const status = JSON.parse(stdout) as TailscaleStatus;
    const dnsName = status.Self?.DNSName;

    if (!dnsName) {
      return null;
    }

    return dnsName.endsWith(".") ? dnsName.slice(0, -1) : dnsName;
  } catch {
    return null;
  }
}

export async function startServe(port: number): Promise<boolean> {
  try {
    await run(
      `tailscale serve --bg --yes --https ${port} http://127.0.0.1:${port}`,
    );
    return true;
  } catch {
    return false;
  }
}

export async function stopServe(port: number): Promise<boolean> {
  try {
    await run(`tailscale serve --https ${port} off`);
    return true;
  } catch {
    return false;
  }
}

export async function getServeUrl(port: number): Promise<string | null> {
  const dnsName = await getDnsName();
  if (!dnsName) {
    return null;
  }

  return `https://${dnsName}:${port}`;
}
