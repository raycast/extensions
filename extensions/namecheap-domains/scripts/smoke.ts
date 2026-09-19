/*
 * Raycast-free smoke test against the Namecheap API (use the sandbox!).
 *
 *   NC_API_USER=… NC_API_KEY=… [NC_USERNAME=…] [NC_CLIENT_IP=…] [NC_SANDBOX=1] npm run smoke -- <command>
 *
 * Commands:
 *   ip                      detect the public IPv4 the extension would send as ClientIp
 *   list [ALL|EXPIRING|EXPIRED]
 *   check a.com,b.io        availability for a comma-separated list
 *   pricing [tld]           registration pricing (all TLDs, or one)
 */
import { createClient } from "../src/namecheap/client";
import { detectPublicIPv4 } from "../src/namecheap/ip";
import { NamecheapApiError } from "../src/namecheap/parse";

const COMMANDS = ["ip", "list", "check", "pricing"] as const;
type Command = (typeof COMMANDS)[number];

const isCommand = (value: string): value is Command => (COMMANDS as readonly string[]).includes(value);

async function main() {
  const [rawCommand = "ip", argument = ""] = process.argv.slice(2);
  if (!isCommand(rawCommand)) {
    throw new Error(`Unknown command "${rawCommand}". Use one of: ${COMMANDS.join(", ")}.`);
  }
  const command: Command = rawCommand;

  if (command === "ip") {
    console.log(await detectPublicIPv4());
    return;
  }

  const apiUser = process.env.NC_API_USER ?? "";
  const apiKey = process.env.NC_API_KEY ?? "";
  if (!apiUser || !apiKey) throw new Error("Set NC_API_USER and NC_API_KEY (and ideally NC_SANDBOX=1).");
  const clientIp = process.env.NC_CLIENT_IP || (await detectPublicIPv4());
  const client = createClient({
    apiUser,
    apiKey,
    userName: process.env.NC_USERNAME,
    clientIp,
    sandbox: process.env.NC_SANDBOX === "1" || process.env.NC_SANDBOX === "true",
  });
  console.error(`→ ${client.endpoint} as ${apiUser} from ${clientIp}`);

  switch (command) {
    case "list": {
      const listType = (argument || "ALL").toUpperCase() as "ALL" | "EXPIRING" | "EXPIRED";
      console.log(JSON.stringify(await client.listAllDomains({ listType }), null, 2));
      return;
    }
    case "check": {
      const domains = argument
        .split(",")
        .map((domain) => domain.trim())
        .filter(Boolean);
      if (domains.length === 0) throw new Error("Pass a comma-separated list of domains.");
      console.log(JSON.stringify(await client.checkDomains(domains), null, 2));
      return;
    }
    case "pricing": {
      const table = await client.getRegisterPricing();
      const tld = argument.trim().toLowerCase().replace(/^\./, "");
      console.log(JSON.stringify(tld ? (table[tld] ?? null) : table, null, 2));
      return;
    }
  }
}

main().catch((error: unknown) => {
  if (error instanceof NamecheapApiError) {
    console.error(`Namecheap error ${error.number}: ${error.message}${error.hint ? `\n${error.hint}` : ""}`);
  } else {
    console.error((error as Error).message ?? error);
  }
  process.exitCode = 1;
});
