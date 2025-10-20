import { List, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import si from "systeminformation";
import { exec } from "child_process";

interface Proc {
  pid: number;
  name: string;
  cpu: number;
  mem: number;
}

export default function Command() {
  const [stats, setStats] = useState<{ markdown: string; procs: Proc[] }>({
    markdown: "",
    procs: [],
  });

  useEffect(() => {
    async function load() {
      const [cpu, mem, procs] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.processes(),
      ]);

      const cores = cpu.cpus.map((c, i) => ({
        name: `CPU${i}`,
        value: c.load,
      }));
      const memUsed = (mem.active / mem.total) * 100;
      const svg = buildFullSvg([{ name: "Mem", value: memUsed }, ...cores]);

      const markdown = `![](data:image/svg+xml;utf8,${encodeURIComponent(svg)})`;

      const top = procs.list
        .sort((a, b) => b.cpu - a.cpu)
        .slice(0, 10)
        .map((p) => ({
          pid: p.pid,
          name: p.name,
          cpu: p.cpu,
          mem: p.mem,
        }));

      setStats({ markdown, procs: top });
    }

    load();
    const interval = setInterval(load, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <List isShowingDetail>
      <List.Item
        title="System Stats"
        detail={<List.Item.Detail markdown={stats.markdown} />}
      />

      <List.Section title="Top Processes">
        {stats.procs.map((p) => (
          <List.Item
            key={p.pid}
            title={p.name}
            accessories={[{ text: p.cpu.toFixed(1) + " %" }]}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="PID"
                      text={p.pid.toString()}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="CPU"
                      text={`${p.cpu.toFixed(1)} %`}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Memory"
                      text={`${p.mem.toFixed(1)} %`}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title="Kill Process"
                  style={Action.Style.Destructive}
                  onAction={() => killProcess(p.pid)}
                />
                <Action.CopyToClipboard
                  title="Copy PID"
                  content={p.pid.toString()}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

async function killProcess(pid: number) {
  const command =
    process.platform === "win32" ? `taskkill /F /PID ${pid}` : `kill -9 ${pid}`;
  exec(command, (err) => {
    if (err) {
      showToast({
        style: Toast.Style.Failure,
        title: `Failed to kill PID ${pid}`,
        message: err.message,
      });
    } else {
      showToast({ style: Toast.Style.Success, title: `Killed PID ${pid}` });
    }
  });
}

function buildFullSvg(allItems: { name: string; value: number }[]) {
  const blocks = 28;
  const blockW = 9;
  const spacing = 1.5;
  const barH = 16;
  const labelW = 65;
  const colPadding = 10;
  const barW = blocks * (blockW + spacing);
  const rowHeight = 22;
  const rowGap = 8;

  const rowsCount = allItems.length;
  const width = "100%";
  const height = rowsCount * (rowHeight + rowGap) + 16;

  const bg = "#000";
  const filledColor = "#ddd";
  const emptyColor = "#222";
  const textColor = "#eee";

  const makeBar = (val: number, xOff: number, yOff: number) => {
    const filled = Math.round((val / 100) * blocks);
    const y = yOff + (rowHeight - barH) / 2;
    let s = "";
    for (let i = 0; i < blocks; i++) {
      const x = xOff + labelW + colPadding + i * (blockW + spacing);
      s += `<rect x="${x}" y="${y}" width="${blockW}" height="${barH}" fill="${
        i < filled ? filledColor : emptyColor
      }"/>`;
    }
    return s;
  };

  let content = "";
  for (let r = 0; r < rowsCount; r++) {
    const y = 12 + r * (rowHeight + rowGap);
    const item = allItems[r];
    const baseY = y + rowHeight / 2;

    const x = 20;
    content += `
      <text x="${x + labelW / 2}" y="${baseY + 4}" class="lbl" text-anchor="middle">${item.name}</text>
      ${makeBar(item.value, x, y)}
      <text x="${x + labelW + colPadding + barW + 10}" y="${baseY + 4}" class="pct">${item.value.toFixed(0)}%</text>
    `;
  }

  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <style>
      .lbl, .pct {
        font-family: monospace;
        font-size: 18px;
        fill: ${textColor};
        dominant-baseline: middle;
      }
    </style>
    <rect width="100%" height="100%" fill="${bg}"/>
    ${content}
  </svg>`;
}
