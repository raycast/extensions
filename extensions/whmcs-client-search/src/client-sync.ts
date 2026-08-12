import {
  showHUD,
  showToast,
  Toast,
  Clipboard,
  getPreferenceValues,
  environment,
  LaunchProps,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

type ApiClient = {
  id: string | number;
  firstname?: string;
  lastname?: string;
  email?: string;
  companyname?: string;
  status?: string;
};

type Client = {
  id: string;
  firstname: string;
  lastname: string;
  name: string;
  email: string;
  company: string;
  urls: {
    profile: string;
    billable: string;
    supportTicket: string;
  };
};

// Custom launch context so we can type modifiers
type ClientSyncLaunchContext = {
  modifiers?: {
    cmd?: boolean;
    opt?: boolean;
    shift?: boolean;
    ctrl?: boolean;
  };
};

type WhmcsResponse = {
  result?: string;
  message?: string;
  clients?: { client?: ApiClient[] };
};

// Strip markup and collapse whitespace so WAF/server error pages stay readable in a toast
function summarizeBody(text: string): string {
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

async function whmcsApiRequest(prefs: Preferences, action: string, params: Record<string, string | number> = {}) {
  const body = new URLSearchParams({
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    identifier: prefs.whmcsApiIdentifier,
    secret: prefs.whmcsApiSecret,
    action,
    responsetype: "json",
  });

  const response = await fetch(prefs.whmcsApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "User-Agent": "Raycast-WHMCS-Client-Search",
    },
    body,
  });

  const text = await response.text();

  let data: WhmcsResponse | undefined;
  try {
    data = JSON.parse(text) as WhmcsResponse;
  } catch {
    data = undefined;
  }

  if (!response.ok) {
    const detail = data?.message ?? summarizeBody(text);
    if (response.status === 403) {
      throw new Error(
        `403 Forbidden${detail ? ` — ${detail}` : ""}. ` +
          `This usually means your IP isn't whitelisted in WHMCS (System Settings → General Settings → Security → API IP Access Restriction) ` +
          `or a firewall/WAF in front of WHMCS blocked the request.`,
      );
    }
    throw new Error(`HTTP error: ${response.status}${detail ? ` — ${detail}` : ""}`);
  }

  if (!data) {
    throw new Error(`WHMCS returned a non-JSON response: ${summarizeBody(text) || "(empty body)"}`);
  }

  if (data.result && String(data.result).toLowerCase() === "error") {
    throw new Error(`WHMCS API Error: ${data.message ?? "Unknown"}`);
  }

  return data;
}

export default async function main(props: LaunchProps<{ launchContext?: ClientSyncLaunchContext }>) {
  try {
    const prefs = getPreferenceValues<Preferences>();

    // Detect modifier keys: Cmd+Return will include inactive clients
    const includeInactive = props.launchContext?.modifiers?.cmd === true;

    // Fetch clients
    const response = await whmcsApiRequest(prefs, "GetClients", { limitnum: 5000 });

    if (!response?.clients?.client) {
      throw new Error("No clients found in response");
    }

    const adminPath = prefs.whmcsAdminPath.replace(/\/$/, "");

    const rawClients = response.clients.client as ApiClient[];

    const filteredClients = includeInactive
      ? rawClients
      : rawClients.filter((c) => String(c.status ?? "").trim() === "Active");

    const clients: Client[] = filteredClients.map((c) => {
      const firstname = String(c.firstname ?? "").trim();
      const lastname = String(c.lastname ?? "").trim();
      const id = String(c.id);

      return {
        id,
        firstname,
        lastname,
        name: `${lastname}, ${firstname}`,
        email: String(c.email ?? ""),
        company: String(c.companyname ?? ""),
        urls: {
          profile: `${adminPath}/clientssummary.php?userid=${id}`,
          billable: `${adminPath}/clientsbillableitems.php?userid=${id}`,
          supportTicket: `${adminPath}/supporttickets.php?action=open&userid=${id}`,
        },
      };
    });

    clients.sort((a: Client, b: Client) => a.name.localeCompare(b.name));

    const dataDir = environment.supportPath;
    await mkdir(dataDir, { recursive: true });
    const filePath = path.join(dataDir, "clients.json");

    await writeFile(filePath, JSON.stringify(clients, null, 2), "utf-8");

    console.log(`✅ Clients saved to: ${filePath}`);

    await showHUD(
      `Synced ${clients.length} client${clients.length === 1 ? "" : "s"}${
        includeInactive ? " (including inactive)" : ""
      } ✅`,
    );
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : String(error);
    try {
      // Surface the failure full-window instead of as a corner toast
      await launchCommand({
        name: "client-search",
        type: LaunchType.UserInitiated,
        context: { syncError: message },
      });
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Client Sync Failed",
        message,
        primaryAction: {
          title: "Copy Error",
          onAction: () => Clipboard.copy(message),
        },
      });
    }
  }
}
