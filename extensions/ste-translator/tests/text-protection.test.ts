import { describe, expect, it } from "vitest";
import { checkPlaceholders, protectText, restoreText } from "../src/services/text-protection";

function protectedTokens(text: string): string[] {
  return protectText(text).tokens;
}

describe("protectText", () => {
  it("protects fenced code blocks entirely", () => {
    const src = "Run this:\n```bash\nrm -rf /tmp/build && make\n```\nThen wait.";
    const { text, tokens } = protectText(src);
    expect(tokens).toContain("```bash\nrm -rf /tmp/build && make\n```");
    expect(text).not.toContain("rm -rf");
  });

  it("protects inline code", () => {
    const { text, tokens } = protectText("Set `max_connections` to the default.");
    expect(tokens).toContain("`max_connections`");
    expect(text).not.toContain("max_connections");
  });

  it("protects URLs, IPv4 addresses with CIDR/port, and UUIDs", () => {
    const tokens = protectedTokens(
      "See https://example.com/a?b=1 and 10.0.0.0/16 and 192.168.1.5:8080 id 123e4567-e89b-12d3-a456-426614174000.",
    );
    expect(tokens).toEqual(
      expect.arrayContaining([
        "https://example.com/a?b=1",
        "10.0.0.0/16",
        "192.168.1.5:8080",
        "123e4567-e89b-12d3-a456-426614174000",
      ]),
    );
  });

  it("protects IPv6 addresses", () => {
    expect(protectedTokens("Host fe80::1ff:fe23:4567:890a is down.")).toContain("fe80::1ff:fe23:4567:890a");
  });

  it("protects cloud resource IDs and ARNs", () => {
    const tokens = protectedTokens("Instance i-0abcd1234ef567890 uses arn:aws:s3:::my-bucket/key.txt.");
    expect(tokens).toContain("i-0abcd1234ef567890");
    expect(tokens.some((t) => t.startsWith("arn:aws:s3:::my-bucket"))).toBe(true);
  });

  it("protects file paths and config keys", () => {
    const tokens = protectedTokens("Edit /etc/nginx/nginx.conf and set DB_HOST and spring.datasource.url.");
    expect(tokens).toEqual(expect.arrayContaining(["/etc/nginx/nginx.conf", "DB_HOST", "spring.datasource.url"]));
  });

  it("protects quoted error messages", () => {
    expect(protectedTokens('The log shows "Connection refused: ECONNRESET".')).toContain(
      '"Connection refused: ECONNRESET"',
    );
  });

  it("protects numbers with units", () => {
    const tokens = protectedTokens("Allocate 16 GB of memory, wait 30 ms, keep below 85%.");
    expect(tokens).toEqual(expect.arrayContaining(["16 GB", "30 ms", "85%"]));
  });

  it("leaves ordinary prose unprotected", () => {
    const { text, tokens } = protectText("The operator should check the pump before starting it.");
    expect(tokens).toEqual([]);
    expect(text).toBe("The operator should check the pump before starting it.");
  });
});

describe("restoreText", () => {
  const samples = [
    "Run:\n```sh\nkubectl get pods -n prod\n```\nand ping 10.1.2.3 for 5 min at https://x.io/y.",
    "Use `--force` only on /var/log/app.log when MAX_RETRIES is 3.",
    "",
  ];
  it.each(samples)("round-trips protect -> restore exactly", (sample) => {
    const { text, tokens } = protectText(sample);
    expect(restoreText(text, tokens)).toBe(sample);
  });

  it("tolerates whitespace inside placeholders added by a model", () => {
    expect(restoreText("Run [[ P0 ]] now.", ["`ls`"])).toBe("Run `ls` now.");
  });

  it("leaves unknown placeholders untouched", () => {
    expect(restoreText("See [[P9]].", ["a"])).toBe("See [[P9]].");
  });
});

describe("checkPlaceholders", () => {
  it("reports missing, duplicated and unknown placeholders", () => {
    const result = checkPlaceholders("[[P0]] and [[P0]] and [[P5]]", 3);
    expect(result).toEqual({ missing: [1, 2], duplicated: [0], unknown: [5] });
  });
});

describe("prose slashes and nested matches", () => {
  it("does not treat words joined by a slash as file paths", () => {
    const src = "Use the SOP/Runbook and/or the input/output log. TCP/IP is fine.";
    const { text, tokens } = protectText(src);
    expect(tokens).toEqual([]);
    expect(text).toBe(src);
  });

  it("still protects real paths after punctuation, spaces and assignments", () => {
    const tokens = protectedTokens("Open (/etc/hosts), then ./run.sh or ../x/y, or set ROOT=/srv/app and ~/notes.");
    expect(tokens).toEqual(expect.arrayContaining(["/etc/hosts", "./run.sh", "../x/y", "/srv/app", "~/notes"]));
  });

  it("protects a quoted string that contains a flag, path or IP as one token", () => {
    const src = 'Run "kubectl drain node-1 --ignore-daemonsets" and read "/var/log/x on 10.0.0.1".';
    const { text, tokens } = protectText(src);
    expect(tokens).toEqual(['"kubectl drain node-1 --ignore-daemonsets"', '"/var/log/x on 10.0.0.1"']);
    expect(text).toBe("Run [[P0]] and read [[P1]].");
    expect(restoreText(text, tokens)).toBe(src);
  });

  it("never leaves a placeholder inside another token", () => {
    const src = 'Check "timeout is 30 ms at 10.0.0.1:80" in `cat /etc/x --flag` and https://a.io/b?c="d".';
    const { text, tokens } = protectText(src);
    for (const token of tokens) expect(token).not.toMatch(/\[\[P\d+\]\]/);
    expect(restoreText(text, tokens)).toBe(src);
  });
});
