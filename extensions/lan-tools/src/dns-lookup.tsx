import {
  Action,
  ActionPanel,
  Detail,
  Toast,
  showToast,
  updateCommandMetadata,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { execFile } from "node:child_process";
import type { LaunchProps } from "@raycast/api";
import { defaultGateway } from "./scan";

interface Arguments {
  host?: string;
}

interface Records {
  a: string[];
  aaaa: string[];
  mx: string[];
  ns: string[];
  ptr?: string[];
}

function runDig(args: string[]): Promise<string> {
  return new Promise((resolve) => {
    execFile(
      "/usr/bin/dig",
      args,
      { timeout: 8000, maxBuffer: 1 << 16 },
      (_e, stdout) => {
        resolve((stdout ?? "").trim());
      },
    );
  });
}

async function lookup(name: string): Promise<Records> {
  const isIp =
    /^[\d.]+$/.test(name) && name.split(".").every((o) => Number.isFinite(+o));
  const [a, aaaa, mx, ns, ptr] = await Promise.all([
    runDig(["+short", "A", name]),
    runDig(["+short", "AAAA", name]),
    runDig(["+short", "MX", name]),
    runDig(["+short", "NS", name]),
    isIp ? runDig(["+short", "-x", name]) : Promise.resolve(""),
  ]);
  const split = (s: string) =>
    s
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  return {
    a: split(a),
    aaaa: split(aaaa),
    mx: split(mx),
    ns: split(ns),
    ptr: ptr ? split(ptr) : undefined,
  };
}

function table(title: string, rows: string[]): string {
  if (rows.length === 0) return "";
  return `### ${title}\n\n${rows.map((r) => `- \`${r}\``).join("\n")}\n\n`;
}

/**
 * DNS lookup for a name (A/AAAA/MX/NS) or a reverse lookup for an IP.
 * Default target = the default gateway (reverse lookup). Rendered as a
 * Detail block with a small section per record type.
 */
export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const host = props.arguments.host?.trim() || defaultGateway() || "";
  const [records, setRecords] = useState<Records | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!host) {
      void showToast({ style: Toast.Style.Failure, title: "No host" });
      setIsLoading(false);
      void updateCommandMetadata({ subtitle: "No host" });
      return;
    }
    void updateCommandMetadata({ subtitle: `Looking up ${host}…` });
    void (async () => {
      try {
        const r = await lookup(host);
        setRecords(r);
        const total =
          r.a.length +
          r.aaaa.length +
          r.mx.length +
          r.ns.length +
          (r.ptr?.length ?? 0);
        void updateCommandMetadata({
          subtitle:
            total === 0
              ? "No records found"
              : `A: ${r.a.length} · AAAA: ${r.aaaa.length} · MX: ${r.mx.length} · NS: ${r.ns.length}`,
        });
      } catch (e) {
        void showToast({
          style: Toast.Style.Failure,
          title: "Lookup failed",
          message: String(e),
        });
        void updateCommandMetadata({ subtitle: "Lookup failed" });
      } finally {
        setIsLoading(false);
      }
    })();
  }, [host]);

  const md = records
    ? [
        `# ${host}\n`,
        table("A (IPv4)", records.a),
        table("AAAA (IPv6)", records.aaaa),
        table("MX (mail)", records.mx),
        table("NS (nameservers)", records.ns),
        records.ptr && records.ptr.length > 0
          ? table("PTR (reverse)", records.ptr)
          : "",
        records.a.length === 0 &&
        records.aaaa.length === 0 &&
        records.mx.length === 0 &&
        records.ns.length === 0 &&
        !records.ptr
          ? "No records found.\n"
          : "",
      ].join("\n")
    : "Looking up…";

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`DNS Lookup ${host}`}
      markdown={md}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Host" content={host} />
        </ActionPanel>
      }
    />
  );
}
