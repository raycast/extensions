import { Detail, Icon, LaunchProps, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import ping from "ping";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";

const execAsync = promisify(exec);

type PingResult = {
  alive: boolean;
  output: string;
  time: number;
  min: number;
  max: number;
  avg: number;
  stddev: number;
  packetLoss: number;
};

async function probeWin32(domain: string): Promise<PingResult> {
  if (!/^[a-zA-Z0-9.-]+$/.test(domain)) {
    throw new Error("Invalid domain format");
  }

  const cmd = `ping -n 3 ${domain}`;
  let stdout: string;
  try {
    ({ stdout } = await execAsync(cmd));
  } catch (err) {
    const error = err as { stdout?: string; message?: string };
    stdout = error?.stdout || error?.message || "";
  }
  const lines = (stdout || "").split(/\r?\n/);

  let packetLoss = 100;
  const times: number[] = [];
  let alive = false;

  const statsLine = lines.find((line) => /Packets: Sent =/.test(line));
  if (statsLine) {
    // Packets: Sent = 3, Received = 3, Lost = 0 (0% loss),
    const lossMatch = statsLine.match(/\((\d+)% loss\)/);
    if (lossMatch) {
      packetLoss = Number(lossMatch[1]);
      alive = packetLoss < 100;
    }
  }

  // Find the "Minimum = xxms, Maximum = xxms, Average = xxms" line
  const timingLine = lines.find((line) => /Minimum =/.test(line));
  let min = NaN,
    max = NaN,
    avg = NaN,
    stddev = NaN,
    time = NaN;

  if (timingLine) {
    // Minimum = 2ms, Maximum = 15ms, Average = 8ms
    const minMatch = timingLine.match(/Minimum = (\d+)ms/);
    const maxMatch = timingLine.match(/Maximum = (\d+)ms/);
    const avgMatch = timingLine.match(/Average = (\d+)ms/);
    min = minMatch ? Number(minMatch[1]) : NaN;
    max = maxMatch ? Number(maxMatch[1]) : NaN;
    avg = avgMatch ? Number(avgMatch[1]) : NaN;
    time = avg;
  }

  // Extract individual reply times for stddev
  lines.forEach((line) => {
    // Reply from ...: bytes=32 time=7ms TTL=...
    const timeMatch = line.match(/time[=<]\s*(\d+)ms/i);
    if (timeMatch) {
      times.push(Number(timeMatch[1]));
    }
  });

  if (times.length > 1) {
    const mean = times.reduce((a, b) => a + b, 0) / times.length;
    stddev = Math.sqrt(times.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / times.length);
  } else {
    stddev = 0;
  }

  return {
    alive,
    output: stdout,
    time: isNaN(time) ? 0 : time,
    min: isNaN(min) ? 0 : min,
    max: isNaN(max) ? 0 : max,
    avg: isNaN(avg) ? 0 : avg,
    stddev,
    packetLoss,
  };
}

async function probeCrossPlatform(domain: string): Promise<PingResult> {
  const result = await ping.promise.probe(domain, { min_reply: 3 });
  return {
    alive: !!result.alive,
    output: result.output ?? "",
    time: Number(result.time) || 0,
    min: Number(result.min) || 0,
    max: Number(result.max) || 0,
    avg: Number(result.avg) || 0,
    stddev: Number(result.stddev) || 0,
    packetLoss: Number(result.packetLoss) || 0,
  };
}

export default function Command(props: LaunchProps) {
  const { domain } = props.arguments;

  const { data, isLoading, error } = usePromise(async () => {
    if (os.platform() === "win32") {
      return await probeWin32(domain);
    } else {
      return await probeCrossPlatform(domain);
    }
  }, []);

  if (isLoading) {
    return (
      <List>
        <List.EmptyView icon={Icon.AlarmRinging} title={`Pinging ${domain}`} />
      </List>
    );
  }

  if (error || !data) {
    return (
      <List>
        <List.EmptyView icon={Icon.Repeat} title="Something wrong happened. Try again." />
      </List>
    );
  }

  const { alive, output, time, min, max, avg, stddev, packetLoss } = data as PingResult;

  if (!alive) {
    return (
      <List>
        <List.EmptyView icon={Icon.HeartDisabled} title="No heart beat!" />
      </List>
    );
  }

  const imageSrc = "alive.jpg";
  const markdown = `
# ${alive ? "It is alive!" : "There is not heart bit!"}

<img src="${imageSrc}" alt="it is alive" style="width:100px" />

\`\`\`
  ${output}
\`\`\`
`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={domain}
      metadata={
        alive ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Domain" text={domain} />
            <Detail.Metadata.Label title="Output" text={output} />
            <Detail.Metadata.TagList title="Alive">
              <Detail.Metadata.TagList.Item text="True" color="green" />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label title="Time" text={time.toString()} />
            <Detail.Metadata.Label title="Min" text={min.toString()} />
            <Detail.Metadata.Label title="Max" text={max.toString()} />
            <Detail.Metadata.Label title="Average" text={avg.toString()} />
            <Detail.Metadata.Label title="Standard Deviation" text={stddev.toString()} />
            <Detail.Metadata.Label title="Packet Loss" text={packetLoss.toString()} />
          </Detail.Metadata>
        ) : (
          <></>
        )
      }
    />
  );
}
