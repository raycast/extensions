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

interface PingReply {
  seq: number;
  ip?: string;
  ms?: number;
  timeout?: boolean;
}

interface Arguments {
  host?: string;
}

type PingError = "no-route" | "unknown-host" | "no-host" | undefined;

/**
 * Ping a host with `ping -c 10 -W 2000`, rendered as a List of replies
 * colored by latency. Default target = google.com. Bounded (always
 * terminates). Captures stderr to distinguish "host drops ICMP" (timeouts)
 * from "no route to host" (e.g. VPN routing) from "unknown host" (DNS).
 */
export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const host = props.arguments.host?.trim() || "google.com";
  const [replies, setReplies] = useState<PingReply[]>([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<PingError>(undefined);
  const [runKey, setRunKey] = useState(0);
  // Track the latest replies in a ref so the close handler can summarize them
  // without capturing a stale `replies` closure.
  const repliesRef = useRef<PingReply[]>([]);

  useEffect(() => {
    if (!host) {
      setError("no-host");
      setDone(true);
      return;
    }
    setReplies([]);
    repliesRef.current = [];
    setDone(false);
    setError(undefined);
    void updateCommandMetadata({ subtitle: `Pinging ${host}…` });

    const proc = spawn("/sbin/ping", ["-c", "10", "-W", "2000", host]);
    let seq = 0;
    let aborted = false;

    const finishSubtitle = () => {
      if (aborted) return;
      const received = repliesRef.current.filter((r) => !r.timeout).length;
      const total = repliesRef.current.length;
      const lossPct = total
        ? Math.round(
            (repliesRef.current.filter((r) => r.timeout).length / total) * 100,
          )
        : 0;
      void updateCommandMetadata({
        subtitle: `${received}/${total} received · ${lossPct}% loss`,
      });
    };

    proc.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      for (const line of text.split("\n")) {
        // macOS: "64 bytes from 192.168.1.20: icmp_seq=0 ttl=64 time=0.104 ms"
        const m = line.match(
          /from\s+([\d.]+):.*icmp_seq=(\d+).*time=([\d.]+)\s*ms/,
        );
        if (m) {
          seq += 1;
          const reply: PingReply = {
            seq: parseInt(m[2], 10),
            ip: m[1],
            ms: parseFloat(m[3]),
          };
          repliesRef.current = [...repliesRef.current, reply];
          setReplies(repliesRef.current);
        } else if (/Request timeout/.test(line)) {
          seq += 1;
          const reply: PingReply = { seq, timeout: true };
          repliesRef.current = [...repliesRef.current, reply];
          setReplies(repliesRef.current);
        }
      }
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      const se = chunk.toString("utf8").toLowerCase();
      // Abort on the first hard error: "No route to host" / "Unknown host"
      // fire on the very first packet, so killing here avoids making the user
      // wait ~10s for a verdict the OS already knows.
      if (/no route to host/.test(se)) {
        aborted = true;
        setError("no-route");
        setDone(true);
        void updateCommandMetadata({ subtitle: "No route to host" });
        try {
          proc.kill();
        } catch {
          /* noop */
        }
        return;
      }
      if (/unknown host|cannot resolve/.test(se)) {
        aborted = true;
        setError("unknown-host");
        setDone(true);
        void updateCommandMetadata({ subtitle: "Unknown host" });
        try {
          proc.kill();
        } catch {
          /* noop */
        }
        return;
      }
    });

    proc.on("close", (code) => {
      setDone(true);
      if (aborted) return;
      if (code && code !== 0 && repliesRef.current.length === 0) {
        // Non-zero exit, no replies, no recognizable stderr — generic failure.
        void showToast({
          style: Toast.Style.Failure,
          title: "Ping failed",
          message: `${host} (exit ${code})`,
        });
        void updateCommandMetadata({ subtitle: "Ping failed" });
        return;
      }
      finishSubtitle();
    });

    return () => {
      try {
        proc.kill();
      } catch {
        /* noop */
      }
    };
    // runKey re-triggers the ping on "Re-run".
  }, [host, runKey]);

  const received = replies.filter((r) => !r.timeout);
  const latencies = received.map((r) => r.ms ?? 0).filter((n) => n > 0);
  const minMs = latencies.length ? Math.min(...latencies) : undefined;
  const avgMs = latencies.length
    ? latencies.reduce((a, b) => a + b, 0) / latencies.length
    : undefined;
  const maxMs = latencies.length ? Math.max(...latencies) : undefined;
  const lossPct = replies.length
    ? Math.round(
        (replies.filter((r) => r.timeout).length / replies.length) * 100,
      )
    : 0;

  const reRun = () => setRunKey((k) => k + 1);

  if (error === "no-host") {
    return (
      <List navigationTitle="Ping">
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="No host"
          description="Pass a host or connect to a network."
        />
      </List>
    );
  }

  if (error === "no-route") {
    return (
      <List navigationTitle={`Ping ${host}`}>
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="No route to host"
          description={`${host} is unreachable. A VPN tunnel may be capturing traffic and not routing the local subnet — try a WAN host, or split-tunnel the LAN.`}
          actions={
            <ActionPanel>
              <Action
                title="Re-Run"
                icon={Icon.RotateClockwise}
                onAction={reRun}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (error === "unknown-host") {
    return (
      <List navigationTitle={`Ping ${host}`}>
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Unknown host"
          description={`${host} could not be resolved.`}
          actions={
            <ActionPanel>
              <Action
                title="Re-Run"
                icon={Icon.RotateClockwise}
                onAction={reRun}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (done && replies.length === 0) {
    return (
      <List navigationTitle={`Ping ${host}`}>
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="No replies"
          description={`${host} did not respond to any of 10 pings. The host may drop ICMP (common for routers/IoT) — try Traceroute, which uses UDP.`}
          actions={
            <ActionPanel>
              <Action
                title="Re-Run"
                icon={Icon.RotateClockwise}
                onAction={reRun}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={!done && replies.length === 0}
      navigationTitle={`Ping ${host}`}
    >
      <List.Section
        title={
          done
            ? `Done · ${received.length}/${replies.length} received · ${lossPct}% loss`
            : "Pinging…"
        }
      >
        {latencies.length > 0 && (
          <List.Item
            icon={{ source: Icon.BarChart, tintColor: Color.Blue }}
            title="Summary"
            subtitle={`min/avg/max = ${minMs?.toFixed(1)} / ${avgMs?.toFixed(1)} / ${maxMs?.toFixed(1)} ms`}
          />
        )}
        {replies.map((r) => {
          const color = r.timeout
            ? Color.Red
            : (r.ms ?? 999) <= 50
              ? Color.Green
              : (r.ms ?? 999) <= 200
                ? Color.Yellow
                : Color.Red;
          const icon = { source: Icon.Dot, tintColor: color };
          return (
            <List.Item
              key={r.seq}
              icon={icon}
              title={`#${r.seq}`}
              subtitle={r.timeout ? "timeout" : `${r.ms?.toFixed(1)} ms`}
              accessories={r.ip ? [{ text: r.ip }] : []}
            />
          );
        })}
      </List.Section>
    </List>
  );
}
