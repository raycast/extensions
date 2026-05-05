import { List, ActionPanel, Action, showToast, Toast, environment } from "@raycast/api";
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
  const [isLoading, setIsLoading] = useState(true);

  const [stats, setStats] = useState<{ markdown: string; procs: Proc[] }>({
    markdown: "",
    procs: [],
  });

  useEffect(() => {
    async function load() {
      try {
        const [cpu, mem, procs] = await Promise.all([si.currentLoad(), si.mem(), si.processes()]);
        const cores = cpu.cpus.map((c, i) => ({
          name: `CPU${i}`,
          value: c.load,
        }));
        const memUsed = (mem.active / mem.total) * 100;
        const isDark = environment.appearance === "dark";
        const svg = buildFullSvg([{ name: "Mem", value: memUsed }, ...cores], isDark);
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
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load system information",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <List isLoading={isLoading} isShowingDetail>
      <List.Item title="System Stats" detail={<List.Item.Detail markdown={stats.markdown} />} />

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
                    <List.Item.Detail.Metadata.Label title="PID" text={p.pid.toString()} />
                    <List.Item.Detail.Metadata.Label title="CPU" text={`${p.cpu.toFixed(1)} %`} />
                    <List.Item.Detail.Metadata.Label title="Memory" text={`${p.mem.toFixed(1)} %`} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action title="Kill Process" style={Action.Style.Destructive} onAction={() => killProcess(p.pid)} />
                <Action.CopyToClipboard title="Copy PID" content={p.pid.toString()} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

async function killProcess(pid: number) {
  const command = process.platform === "win32" ? `taskkill /F /PID ${pid}` : `kill -9 ${pid}`;
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

function buildFullSvg(allItems: { name: string; value: number }[], isDark: boolean) {
  const width = 400;
  const rowHeight = 26;
  const rowGap = 2;

  // layout columns
  const labelW = 65; // space for "CPU0"
  const pctW = 55; // space for "100%"
  const sidePad = 0; // no padding on sides to maximize bar space

  // bar configuration
  const blocks = 15;
  const spacing = 2;

  // calculate bar dimensions
  const availableWidth = width - labelW - pctW - sidePad * 2;
  const totalSpacing = (blocks - 1) * spacing;
  const blockW = (availableWidth - totalSpacing) / blocks;
  const barH = 18;

  // colors
  const bg = "transparent";
  const filledColor = isDark ? "#a78bfa" : "#7c3aed"; // violet
  const emptyColor = isDark ? "#333333" : "#e5e7eb"; // dark gray / light gray
  const textColor = isDark ? "#ffffff" : "#000000"; // high contrast text

  // generate content
  const rowsCount = allItems.length;
  const fontSize = 16;
  const contentHeight = rowsCount * rowHeight + (rowsCount - 1) * rowGap;
  const minPadding = fontSize / 2;
  const verticalPadding = minPadding;
  const totalHeight = contentHeight + verticalPadding * 2;

  const makeBar = (val: number, xOff: number, yOff: number) => {
    const filled = Math.round((val / 100) * blocks);
    const barY = yOff + (rowHeight - barH) / 2;
    let s = "";
    for (let i = 0; i < blocks; i++) {
      const x = xOff + i * (blockW + spacing);
      s += `<rect x="${x}" y="${barY}" width="${blockW}" height="${barH}" rx="2" fill="${
        i < filled ? filledColor : emptyColor
      }"/>`;
    }
    return s;
  };

  let content = "";
  for (let r = 0; r < rowsCount; r++) {
    const y = verticalPadding + r * (rowHeight + rowGap);
    const item = allItems[r];
    const barY = y + (rowHeight - barH) / 2;
    const barCenterY = barY + barH / 2;
    const textY = barCenterY + 5;

    const labelX = sidePad + labelW / 2;
    const barX = sidePad + labelW;
    const pctX = width - sidePad;

    content += `
      <!-- Label -->
      <text x="${labelX}" y="${textY}" class="lbl" text-anchor="middle">${item.name}</text>
      <!-- Bar -->
      ${makeBar(item.value, barX, y)}
      <!-- Percent -->
      <text x="${pctX}" y="${textY}" class="pct" text-anchor="end">${item.value.toFixed(0)}%</text>
    `;
  }

  const displayWidth = 360;
  const aspectRatio = totalHeight / width;
  const baseDisplayHeight = displayWidth * aspectRatio;
  const extraVerticalSpace = 100;
  const displayHeight = baseDisplayHeight + extraVerticalSpace;
  const viewBoxY = -extraVerticalSpace / 2;
  const viewBoxHeight = totalHeight + extraVerticalSpace;
  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${displayWidth}" height="${displayHeight}" viewBox="0 ${viewBoxY} ${width} ${viewBoxHeight}" preserveAspectRatio="xMidYMid meet" style="display: block; margin: 0 auto; max-width: 100%;">
    <style>
      .lbl, .pct {
        font-family: monospace;
        font-weight: bold;
        font-size: ${fontSize}px; 
        fill: ${textColor};
        dominant-baseline: middle;
        text-anchor: middle;
      }
      .pct {
        text-anchor: end;
      }
    </style>
    <rect width="100%" height="100%" fill="${bg}"/>
    ${content}
  </svg>`;
}
