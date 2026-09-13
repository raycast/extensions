import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  showToast,
  updateCommandMetadata,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { spawn } from "node:child_process";
import type { LaunchProps } from "@raycast/api";
import { defaultGateway } from "./scan";

interface Hop {
  n: number;
  host?: string;
  ip?: string;
  ms?: number;
  timeout?: boolean;
}

interface Arguments {
  host?: string;
}

/**
 * Traceroute a host (`traceroute -m 30 -w 2 -q 1`), rendered as a List of
 * hops. Each row: hop #, hostname (if reverse-DNS resolved), IP, latency.
 * Default target = the default gateway.
 */
export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const host = props.arguments.host?.trim() || defaultGateway() || "";
  const [hops, setHops] = useState<Hop[]>([]);
  const [done, setDone] = useState(false);
  const hopsRef = useRef<Hop[]>([]);

  useEffect(() => {
    if (!host) {
      void showToast({
        style: Toast.Style.Failure,
        title: "No host",
        message: "Pass a host or connect to a network.",
      });
      setDone(true);
      void updateCommandMetadata({ subtitle: "No host" });
      return;
    }
    setHops([]);
    hopsRef.current = [];
    setDone(false);
    void updateCommandMetadata({ subtitle: `Tracing ${host}…` });

    const proc = spawn("/usr/sbin/traceroute", [
      "-m",
      "30",
      "-w",
      "2",
      "-q",
      "1",
      host,
    ]);

    proc.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      for (const line of text.split("\n")) {
        // " 1  192.168.1.1 (192.168.1.1)  0.512 ms"
        // " 2  * * *"
        const m = line.match(/^\s*(\d+)\s+(.*)$/);
        if (!m) continue;
        const n = parseInt(m[1], 10);
        const rest = m[2];
        if (/^\*/.test(rest)) {
          const hop: Hop = { n, timeout: true };
          hopsRef.current = [...hopsRef.current, hop];
          setHops(hopsRef.current);
          continue;
        }
        const hm = rest.match(/^(\S+)\s+\(([\d.]+)\)\s+([\d.]+)\s*ms/);
        if (hm) {
          const hop: Hop = { n, host: hm[1], ip: hm[2], ms: parseFloat(hm[3]) };
          hopsRef.current = [...hopsRef.current, hop];
          setHops(hopsRef.current);
        } else {
          const im = rest.match(/^\(([\d.]+)\)\s+([\d.]+)\s*ms/);
          if (im) {
            const hop: Hop = { n, ip: im[1], ms: parseFloat(im[2]) };
            hopsRef.current = [...hopsRef.current, hop];
            setHops(hopsRef.current);
          }
        }
      }
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      const se = chunk.toString("utf8").toLowerCase();
      if (
        /no route to host|unknown host|cannot resolve|traceroute: socket/.test(
          se,
        )
      ) {
        setDone(true);
        void updateCommandMetadata({ subtitle: "No route to host" });
        try {
          proc.kill();
        } catch {
          /* noop */
        }
      }
    });

    proc.on("close", (code) => {
      setDone(true);
      if (code && hopsRef.current.length === 0) {
        void updateCommandMetadata({ subtitle: "No route to host" });
      } else {
        void updateCommandMetadata({
          subtitle: `${hopsRef.current.length} hops · done`,
        });
      }
    });

    return () => {
      try {
        proc.kill();
      } catch {
        /* noop */
      }
    };
  }, [host]);

  return (
    <List
      isLoading={!done && hops.length === 0}
      navigationTitle={`Traceroute ${host}`}
    >
      <List.Section title={done ? `Done · ${hops.length} hops` : "Tracing…"}>
        {hops.map((h) => {
          const color = h.timeout ? Color.Red : Color.Green;
          const icon = { source: Icon.Dot, tintColor: color };
          return (
            <List.Item
              key={h.n}
              icon={icon}
              title={`#${h.n}`}
              subtitle={
                h.timeout
                  ? "*"
                  : h.host && h.host !== h.ip
                    ? `${h.host} (${h.ip})`
                    : h.ip
              }
              accessories={
                h.ms !== undefined ? [{ text: `${h.ms.toFixed(1)} ms` }] : []
              }
              actions={
                h.ip ? (
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy IP" content={h.ip} />
                  </ActionPanel>
                ) : undefined
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
