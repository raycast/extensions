const { test, describe } = require("node:test");
const assert = require("node:assert");
const { execFile } = require("child_process");
const { promisify } = require("util");
const net = require("net");

const execFileAsync = promisify(execFile);
const COMMAND_TIMEOUT_MS = 8000;

// Logic functions mirroring src/dns-quick-change.tsx
function validateNetworkServiceName(serviceName) {
  return /^[\w\- /().]+$/.test(serviceName);
}

function parsePresetLine(line) {
  line = line.trim();
  if (!line || line.startsWith("#")) return null;

  const eqIndex = line.indexOf("=");
  if (eqIndex === -1) return null;

  const name = line.substring(0, eqIndex);
  const rest = line.substring(eqIndex + 1);

  if (!/^[^\s=]+$/.test(name)) {
    return null;
  }

  const colonIndex = rest.indexOf(":");
  let servers;
  let description;

  if (colonIndex === -1) {
    servers = rest;
  } else {
    servers = rest.substring(0, colonIndex);
    description = rest.substring(colonIndex + 1).trim();
  }

  if (!name || !servers) return null;
  return { name, servers, description: description || undefined };
}

function parseNetworkServices(output) {
  const mappings = [];
  let service;

  for (const line of output.split(/\r?\n/)) {
    const serviceMatch = line.match(/^\s*\(\d+\)\s+(.+)\s*$/);
    if (serviceMatch) {
      service = serviceMatch[1].trim();
      continue;
    }

    const deviceMatch = line.match(/^\s*\(Hardware Port: .*?, Device: ([^)]+)\)\s*$/);
    if (service && deviceMatch) {
      const device = deviceMatch[1].trim();
      if (validateNetworkServiceName(service) && /^[A-Za-z0-9._-]+$/.test(device)) {
        mappings.push({ service, device });
      }
      service = undefined;
    } else if (line.trim() === "" || line.startsWith("(*)")) {
      service = undefined;
    }
  }
  return mappings;
}

function parseDefaultRouteInterface(routeOutput) {
  return routeOutput.match(/^\s*interface:\s*(\S+)/m)?.[1];
}

function selectActiveNetworkService(services, routeIface) {
  // If route interface is not a virtual tunnel (utun, ppp, ipsec, etc.), try direct match
  if (routeIface && !/^(utun|ppp|ipsec|gif|stf)/i.test(routeIface)) {
    const direct = services.find((entry) => entry.device === routeIface);
    if (direct) {
      return direct;
    }
  }

  // Fallback: Skip virtual tunnel interfaces and pick first physical adapter
  const physical = services.find((entry) => !/^(utun|ppp|ipsec|gif|stf|bridge)/i.test(entry.device));
  if (physical) {
    return physical;
  }

  if (services.length > 0) {
    return services[0];
  }

  return { service: "Wi-Fi", device: "en0" };
}

function parseActiveDNS(output) {
  const nameservers = new Set();
  const lines = output.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/nameserver\[\d+\]\s*:\s*([^\s]+)/);
    if (match && net.isIP(match[1])) {
      nameservers.add(match[1]);
    }
  }
  return Array.from(nameservers);
}

function parseManualDNS(output) {
  if (
    !output ||
    output.includes("aren't any DNS Servers set") ||
    output.toLowerCase().includes("there aren't any") ||
    output.trim() === ""
  ) {
    return [];
  }

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => Boolean(line) && !line.startsWith("*") && net.isIP(line) !== 0);
}

async function getNetworkServices(exec = execFileAsync) {
  try {
    const { stdout } = await exec("/usr/sbin/networksetup", ["-listnetworkserviceorder"], {
      encoding: "utf-8",
      timeout: COMMAND_TIMEOUT_MS,
    });
    return parseNetworkServices(stdout);
  } catch (error) {
    return [];
  }
}

async function getActiveNetworkService(exec = execFileAsync) {
  let iface;
  try {
    const { stdout: route } = await exec("/sbin/route", ["-n", "get", "default"], {
      encoding: "utf-8",
      timeout: COMMAND_TIMEOUT_MS,
    });
    iface = parseDefaultRouteInterface(route);
  } catch {
    // Route inspection failed
  }

  const services = await getNetworkServices(exec);
  return selectActiveNetworkService(services, iface);
}

async function getNetworkInterfaceForService(serviceName, exec = execFileAsync) {
  try {
    const services = await getNetworkServices(exec);
    return services.find((entry) => entry.service === serviceName)?.device;
  } catch {
    return undefined;
  }
}

async function getManualDNS(service, exec = execFileAsync) {
  try {
    const { stdout } = await exec("/usr/sbin/networksetup", ["-getdnsservers", service], {
      encoding: "utf-8",
      timeout: COMMAND_TIMEOUT_MS,
    });
    return parseManualDNS(stdout);
  } catch {
    return [];
  }
}

async function getActiveDNS(exec = execFileAsync) {
  try {
    const { stdout } = await exec("/usr/sbin/scutil", ["--dns"], {
      encoding: "utf-8",
      timeout: COMMAND_TIMEOUT_MS,
    });
    return parseActiveDNS(stdout);
  } catch {
    return [];
  }
}

async function getNetworkInterfaceDetails(service, device, exec = execFileAsync) {
  const details = {};

  try {
    const ipinfoPromise = exec("/usr/sbin/networksetup", ["-getinfo", service], {
      encoding: "utf-8",
      timeout: COMMAND_TIMEOUT_MS,
    }).catch(() => null);

    const targetDevice = device ?? (await getNetworkInterfaceForService(service, exec)) ?? "en0";
    const ifconfigPromise = exec("/sbin/ifconfig", [targetDevice], {
      encoding: "utf-8",
      timeout: COMMAND_TIMEOUT_MS,
    }).catch(() => null);

    const [ipinfoRes, ifconfigRes] = await Promise.all([ipinfoPromise, ifconfigPromise]);

    if (ipinfoRes?.stdout) {
      ipinfoRes.stdout.split(/\r?\n/).forEach((line) => {
        const match = line.match(/^([^:]+):\s*(.*)$/);
        if (match) {
          const [, key, value] = match;
          if (value.trim()) {
            details[key.trim()] = value.trim();
          }
        }
      });
    }

    if (ifconfigRes?.stdout) {
      const mac = ifconfigRes.stdout.match(/\bether\s+([\da-f:]+)/i)?.[1];
      if (mac) {
        details["MAC Address"] = mac;
      }
    }
  } catch {
    // Error handling
  }

  return details;
}

async function getNetworkInfo(service, exec = execFileAsync) {
  const [manualDNS, activeDNS] = await Promise.all([getManualDNS(service, exec), getActiveDNS(exec)]);
  const isDHCP = manualDNS.length === 0;

  return {
    service,
    manualDNS,
    activeDNS,
    isDHCP,
  };
}

async function runWithAdmin(command, exec = execFileAsync) {
  const b64 = Buffer.from(command, "utf8").toString("base64");
  const script = `do shell script "echo '${b64}' | base64 -D | sh" with administrator privileges`;
  try {
    await exec("/usr/bin/osascript", ["-e", script], {
      encoding: "utf-8",
      timeout: 60000,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("(-128)") || message.includes("User canceled")) {
      throw new Error("DNS change canceled by user");
    }
    throw error;
  }
}

async function setDNS(servers, service = "Wi-Fi", exec = execFileAsync) {
  if (!validateNetworkServiceName(service)) {
    throw new Error(`Invalid network service name: "${service}". Service name may have been tampered with.`);
  }

  for (const ip of servers) {
    if (!net.isIP(ip)) {
      throw new Error(`Invalid IP address: "${ip}". Preset file may have been tampered with.`);
    }
  }

  const networksetup = "/usr/sbin/networksetup";
  const flushCmd = "/usr/bin/dscacheutil -flushcache && /usr/bin/killall -HUP mDNSResponder 2>/dev/null || true";

  if (servers.length === 0) {
    await runWithAdmin(`${networksetup} -setdnsservers '${service}' empty && ${flushCmd}`, exec);
  } else {
    const dnsArgs = servers.map((s) => `'${s}'`).join(" ");
    await runWithAdmin(`${networksetup} -setdnsservers '${service}' ${dnsArgs} && ${flushCmd}`, exec);
  }
}

describe("Network Service Name Validation", () => {
  test("allows valid macOS network service names", () => {
    assert.strictEqual(validateNetworkServiceName("Wi-Fi"), true);
    assert.strictEqual(validateNetworkServiceName("Ethernet"), true);
    assert.strictEqual(validateNetworkServiceName("Display Ethernet 2"), true);
    assert.strictEqual(validateNetworkServiceName("USB 10/100/1000 LAN"), true);
    assert.strictEqual(validateNetworkServiceName("USB 10/100/1G/2.5G LAN"), true);
    assert.strictEqual(validateNetworkServiceName("Thunderbolt Bridge"), true);
    assert.strictEqual(validateNetworkServiceName("Thunderbolt Ethernet (Slot 1)"), true);
    assert.strictEqual(validateNetworkServiceName("VPN (L2TP)"), true);
  });

  test("rejects dangerous or shell-sensitive characters", () => {
    assert.strictEqual(validateNetworkServiceName("Wi-Fi; rm -rf /"), false);
    assert.strictEqual(validateNetworkServiceName("Wi-Fi && whoami"), false);
    assert.strictEqual(validateNetworkServiceName("Wi-Fi'$(whoami)'"), false);
    assert.strictEqual(validateNetworkServiceName("Wi-Fi\""), false);
    assert.strictEqual(validateNetworkServiceName("Wi-Fi`id`"), false);
    assert.strictEqual(validateNetworkServiceName("Wi-Fi\nmalicious"), false);
    assert.strictEqual(validateNetworkServiceName("Wi-Fi|cat /etc/passwd"), false);
    assert.strictEqual(validateNetworkServiceName("Wi-Fi > /dev/null"), false);
  });
});

describe("DNS Preset Line Parsing", () => {
  test("parses name=servers:description lines", () => {
    const res = parsePresetLine("cloudflare=1.1.1.1,1.0.0.1:Fast & Private");
    assert.deepStrictEqual(res, {
      name: "cloudflare",
      servers: "1.1.1.1,1.0.0.1",
      description: "Fast & Private",
    });
  });

  test("parses line without description", () => {
    const res = parsePresetLine("quad9=9.9.9.9,149.112.112.112");
    assert.deepStrictEqual(res, {
      name: "quad9",
      servers: "9.9.9.9,149.112.112.112",
      description: undefined,
    });
  });

  test("handles comments and empty lines safely", () => {
    assert.strictEqual(parsePresetLine("# comment"), null);
    assert.strictEqual(parsePresetLine(""), null);
    assert.strictEqual(parsePresetLine("   "), null);
  });

  test("rejects invalid preset names", () => {
    assert.strictEqual(parsePresetLine("invalid name=1.1.1.1"), null);
    assert.strictEqual(parsePresetLine("=1.1.1.1"), null);
    assert.strictEqual(parsePresetLine("noequals"), null);
  });
});

describe("IP Address Validation (IPv4 and IPv6)", () => {
  test("validates IPv4 addresses", () => {
    assert.ok(net.isIP("1.1.1.1"));
    assert.ok(net.isIP("8.8.8.8"));
    assert.ok(net.isIP("10.11.59.10"));
    assert.ok(net.isIP("192.168.1.1"));
  });

  test("validates IPv6 addresses", () => {
    assert.ok(net.isIP("2606:4700:4700::1111"));
    assert.ok(net.isIP("2001:4860:4860::8888"));
    assert.ok(net.isIP("::1"));
    assert.ok(net.isIP("2620:fe::fe"));
  });

  test("rejects invalid IPs and command injection attempts", () => {
    assert.strictEqual(net.isIP("999.999.999.999"), 0);
    assert.strictEqual(net.isIP("1.1.1.1; echo injected"), 0);
    assert.strictEqual(net.isIP("1.1.1.1'$(whoami)'"), 0);
    assert.strictEqual(net.isIP("not-an-ip"), 0);
    assert.strictEqual(net.isIP(""), 0);
  });
});

describe("Network Service Order Parsing", () => {
  test("parses service order output correctly including 2.5G adapters and unassigned devices", () => {
    const sampleOutput = `An asterisk (*) denotes that a network service is disabled.
(1) Display Ethernet 2
(Hardware Port: Display Ethernet, Device: en11)

(2) USB 10/100/1G/2.5G LAN
(Hardware Port: USB 10/100/1G/2.5G LAN, Device: en16)

(3) Wi-Fi
(Hardware Port: Wi-Fi, Device: en0)

(4) NordVPN NordLynx
(Hardware Port: com.nordvpn.NordVPN, Device: )

(*) academy-regular
(Hardware Port: com.algoritmico.ios.Passepartout, Device: )

(5) Thunderbolt Bridge
(Hardware Port: Thunderbolt Bridge, Device: bridge0)
`;
    const mappings = parseNetworkServices(sampleOutput);
    assert.deepStrictEqual(mappings, [
      { service: "Display Ethernet 2", device: "en11" },
      { service: "USB 10/100/1G/2.5G LAN", device: "en16" },
      { service: "Wi-Fi", device: "en0" },
      { service: "Thunderbolt Bridge", device: "bridge0" },
    ]);
  });
});

describe("Default Route Parsing and Service Selection", () => {
  test("extracts interface from route output", () => {
    const sampleRoute = `   route to: default
destination: default
       mask: default
    gateway: 192.168.1.1
  interface: en0
      flags: <UP,GATEWAY,DONE,STATIC,PRCLONING,GLOBAL>
`;
    assert.strictEqual(parseDefaultRouteInterface(sampleRoute), "en0");
  });

  test("returns undefined when interface line is missing", () => {
    assert.strictEqual(parseDefaultRouteInterface("no interface here"), undefined);
  });

  test("selects direct matching service for detected route interface", () => {
    const services = [
      { service: "Display Ethernet", device: "en11" },
      { service: "Wi-Fi", device: "en0" },
    ];
    const selected = selectActiveNetworkService(services, "en0");
    assert.deepStrictEqual(selected, { service: "Wi-Fi", device: "en0" });
  });

  test("falls back to physical adapter when route is a virtual VPN tunnel (utun)", () => {
    const services = [
      { service: "VPN Tunnel", device: "utun2" },
      { service: "Wi-Fi", device: "en0" },
      { service: "Thunderbolt Bridge", device: "bridge0" },
    ];
    const selected = selectActiveNetworkService(services, "utun2");
    assert.deepStrictEqual(selected, { service: "Wi-Fi", device: "en0" });
  });

  test("falls back to physical adapter when route interface is unmapped", () => {
    const services = [
      { service: "Thunderbolt Bridge", device: "bridge0" },
      { service: "Ethernet", device: "en1" },
    ];
    const selected = selectActiveNetworkService(services, "unknown_iface");
    assert.deepStrictEqual(selected, { service: "Ethernet", device: "en1" });
  });

  test("falls back to default Wi-Fi/en0 when service list is empty", () => {
    const selected = selectActiveNetworkService([], "en0");
    assert.deepStrictEqual(selected, { service: "Wi-Fi", device: "en0" });
  });
});

describe("Manual DNS Parsing", () => {
  test("parses single or multiple manual DNS IPs", () => {
    const output = `1.1.1.1
1.0.0.1
2606:4700:4700::1111
`;
    assert.deepStrictEqual(parseManualDNS(output), ["1.1.1.1", "1.0.0.1", "2606:4700:4700::1111"]);
  });

  test("returns empty array for DHCP message", () => {
    const output = "There aren't any DNS Servers set on Wi-Fi.";
    assert.deepStrictEqual(parseManualDNS(output), []);
  });

  test("returns empty array for empty or whitespace output", () => {
    assert.deepStrictEqual(parseManualDNS(""), []);
    assert.deepStrictEqual(parseManualDNS("   \n  \n"), []);
  });

  test("ignores comment lines, warnings, and non-IP lines", () => {
    const output = `* Note: system overrides active
1.1.1.1
invalid-text
8.8.8.8
`;
    assert.deepStrictEqual(parseManualDNS(output), ["1.1.1.1", "8.8.8.8"]);
  });
});

describe("Active DNS Extraction", () => {
  test("extracts IPv4 and IPv6 nameservers from scutil --dns output", () => {
    const sampleScutilOutput = `DNS configuration

resolver #1
  search domain[0] : skills.local
  nameserver[0] : 10.11.59.10
  nameserver[1] : 2606:4700:4700::1111
  if_index : 14 (en0)
  flags    : Request A records

resolver #2
  domain   : local
  options  : mdns
  timeout  : 5

DNS configuration (for scoped queries)

resolver #1
  nameserver[0] : 10.11.59.10
  if_index : 14 (en0)
`;
    const servers = parseActiveDNS(sampleScutilOutput);
    assert.deepStrictEqual(servers, ["10.11.59.10", "2606:4700:4700::1111"]);
  });

  test("returns empty array when scutil output has no valid nameservers", () => {
    assert.deepStrictEqual(parseActiveDNS("no dns info"), []);
  });
});

describe("Async Network Operations & Error Handling", () => {
  test("getNetworkServices returns parsed services on success", async () => {
    const mockExec = async () => ({
      stdout: "(1) Wi-Fi\n(Hardware Port: Wi-Fi, Device: en0)\n",
    });
    const services = await getNetworkServices(mockExec);
    assert.deepStrictEqual(services, [{ service: "Wi-Fi", device: "en0" }]);
  });

  test("getNetworkServices handles command errors gracefully by returning empty array", async () => {
    const failingExec = async () => {
      throw new Error("Command failed: /usr/sbin/networksetup timed out");
    };
    const services = await getNetworkServices(failingExec);
    assert.deepStrictEqual(services, []);
  });

  test("getActiveNetworkService detects route and maps to service", async () => {
    const mockExec = async (cmd) => {
      if (cmd.includes("route")) {
        return { stdout: "interface: en0\n" };
      }
      return { stdout: "(1) Wi-Fi\n(Hardware Port: Wi-Fi, Device: en0)\n" };
    };
    const active = await getActiveNetworkService(mockExec);
    assert.deepStrictEqual(active, { service: "Wi-Fi", device: "en0" });
  });

  test("getActiveNetworkService falls back when route command fails", async () => {
    const mockExec = async (cmd) => {
      if (cmd.includes("route")) {
        throw new Error("route: route not found");
      }
      return { stdout: "(1) Ethernet\n(Hardware Port: Ethernet, Device: en1)\n" };
    };
    const active = await getActiveNetworkService(mockExec);
    assert.deepStrictEqual(active, { service: "Ethernet", device: "en1" });
  });

  test("getNetworkInterfaceForService maps existing service to device", async () => {
    const mockExec = async () => ({
      stdout: "(1) Wi-Fi\n(Hardware Port: Wi-Fi, Device: en0)\n",
    });
    const device = await getNetworkInterfaceForService("Wi-Fi", mockExec);
    assert.strictEqual(device, "en0");

    const nonExistent = await getNetworkInterfaceForService("NonExistent", mockExec);
    assert.strictEqual(nonExistent, undefined);
  });

  test("getManualDNS returns empty array for DHCP", async () => {
    const mockExec = async () => ({
      stdout: "There aren't any DNS Servers set on Wi-Fi.\n",
    });
    const servers = await getManualDNS("Wi-Fi", mockExec);
    assert.deepStrictEqual(servers, []);
  });

  test("getManualDNS returns empty array on command failure", async () => {
    const mockExec = async () => {
      throw new Error("Service not found");
    };
    const servers = await getManualDNS("InvalidService", mockExec);
    assert.deepStrictEqual(servers, []);
  });

  test("getActiveDNS returns nameservers from scutil", async () => {
    const mockExec = async () => ({
      stdout: "resolver #1\nnameserver[0] : 1.1.1.1\nnameserver[1] : 8.8.8.8\n",
    });
    const servers = await getActiveDNS(mockExec);
    assert.deepStrictEqual(servers, ["1.1.1.1", "8.8.8.8"]);
  });

  test("getActiveDNS returns empty array on scutil failure", async () => {
    const mockExec = async () => {
      throw new Error("scutil error");
    };
    const servers = await getActiveDNS(mockExec);
    assert.deepStrictEqual(servers, []);
  });

  test("getNetworkInterfaceDetails parses ipinfo and ifconfig output", async () => {
    const mockExec = async (cmd) => {
      if (cmd.includes("networksetup")) {
        return {
          stdout: "IP address: 192.168.1.100\nSubnet mask: 255.255.255.0\nRouter: 192.168.1.1\n",
        };
      }
      if (cmd.includes("ifconfig")) {
        return {
          stdout: "en0: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST>\n\tether 38:f9:d3:ab:cd:ef\n",
        };
      }
      return { stdout: "" };
    };

    const details = await getNetworkInterfaceDetails("Wi-Fi", "en0", mockExec);
    assert.strictEqual(details["IP address"], "192.168.1.100");
    assert.strictEqual(details["Subnet mask"], "255.255.255.0");
    assert.strictEqual(details["Router"], "192.168.1.1");
    assert.strictEqual(details["MAC Address"], "38:f9:d3:ab:cd:ef");
  });

  test("getNetworkInterfaceDetails handles ifconfig failure gracefully", async () => {
    const mockExec = async (cmd) => {
      if (cmd.includes("networksetup")) {
        return { stdout: "IP address: 10.0.0.5\n" };
      }
      throw new Error("ifconfig device not found");
    };

    const details = await getNetworkInterfaceDetails("Wi-Fi", "en0", mockExec);
    assert.strictEqual(details["IP address"], "10.0.0.5");
    assert.strictEqual(details["MAC Address"], undefined);
  });

  test("getNetworkInfo compiles manual, active, and DHCP status", async () => {
    const mockExec = async (cmd) => {
      if (cmd.includes("networksetup")) {
        return { stdout: "There aren't any DNS Servers set on Wi-Fi." };
      }
      return { stdout: "resolver #1\nnameserver[0] : 192.168.1.1\n" };
    };

    const info = await getNetworkInfo("Wi-Fi", mockExec);
    assert.strictEqual(info.service, "Wi-Fi");
    assert.deepStrictEqual(info.manualDNS, []);
    assert.deepStrictEqual(info.activeDNS, ["192.168.1.1"]);
    assert.strictEqual(info.isDHCP, true);
  });

  test("runWithAdmin throws friendly error on user cancellation (-128)", async () => {
    const mockExec = async () => {
      const err = new Error("execution error: User canceled. (-128)");
      throw err;
    };

    await assert.rejects(
      async () => {
        await runWithAdmin("ls", mockExec);
      },
      {
        message: "DNS change canceled by user",
      },
    );
  });

  test("runWithAdmin rethrows non-cancellation errors", async () => {
    const mockExec = async () => {
      throw new Error("osascript: authorization failed: incorrect password");
    };

    await assert.rejects(
      async () => {
        await runWithAdmin("ls", mockExec);
      },
      {
        message: "osascript: authorization failed: incorrect password",
      },
    );
  });

  test("setDNS validates service name against command injection", async () => {
    await assert.rejects(
      async () => {
        await setDNS(["1.1.1.1"], "Wi-Fi; rm -rf /");
      },
      {
        message: /Invalid network service name/,
      },
    );
  });

  test("setDNS validates IP addresses against command injection", async () => {
    await assert.rejects(
      async () => {
        await setDNS(["1.1.1.1; whoami"], "Wi-Fi");
      },
      {
        message: /Invalid IP address/,
      },
    );
  });

  test("setDNS resets to empty for DHCP when servers array is empty", async () => {
    let executedScript = "";
    const mockExec = async (bin, args) => {
      executedScript = args[1];
      return { stdout: "" };
    };

    await setDNS([], "Wi-Fi", mockExec);
    assert.ok(executedScript.includes("do shell script"));
    // Verify base64 decoded payload sets 'empty'
    const b64Match = executedScript.match(/echo '([^']+)' \| base64 -D/);
    assert.ok(b64Match);
    const decoded = Buffer.from(b64Match[1], "base64").toString("utf-8");
    assert.ok(decoded.includes("-setdnsservers 'Wi-Fi' empty"));
    assert.ok(decoded.includes("dscacheutil -flushcache"));
  });

  test("setDNS executes networksetup with quoted DNS servers and cache flush", async () => {
    let executedScript = "";
    const mockExec = async (bin, args) => {
      executedScript = args[1];
      return { stdout: "" };
    };

    await setDNS(["1.1.1.1", "1.0.0.1"], "Wi-Fi", mockExec);
    const b64Match = executedScript.match(/echo '([^']+)' \| base64 -D/);
    assert.ok(b64Match);
    const decoded = Buffer.from(b64Match[1], "base64").toString("utf-8");
    assert.ok(decoded.includes("-setdnsservers 'Wi-Fi' '1.1.1.1' '1.0.0.1'"));
    assert.ok(decoded.includes("dscacheutil -flushcache"));
  });
});

describe("macOS System Utilities Integration", () => {
  test("can list network services on current macOS system", async () => {
    const { stdout } = await execFileAsync("/usr/sbin/networksetup", ["-listnetworkserviceorder"], {
      encoding: "utf-8",
    });
    const mappings = parseNetworkServices(stdout);
    assert.ok(mappings.length > 0, "Should detect at least one active network service");
    const wifi = mappings.find((m) => m.service === "Wi-Fi");
    assert.ok(wifi, "Wi-Fi service should be detected");
    assert.strictEqual(wifi.device, "en0");
  });

  test("can query scutil --dns without throwing", async () => {
    const { stdout } = await execFileAsync("/usr/sbin/scutil", ["--dns"], { encoding: "utf-8" });
    const servers = parseActiveDNS(stdout);
    assert.ok(Array.isArray(servers));
    assert.ok(servers.length > 0, "Should detect active DNS servers");
  });

  test("can determine default route interface", async () => {
    const { stdout } = await execFileAsync("/sbin/route", ["-n", "get", "default"], { encoding: "utf-8" });
    const iface = parseDefaultRouteInterface(stdout);
    assert.ok(iface, "Should identify the default route interface");
    assert.strictEqual(iface, "en0");
  });
});
