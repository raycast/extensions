import { Detail, LaunchProps } from "@raycast/api";
import { YASB } from "./executor";

export default function MonitorInformation(props: LaunchProps<{ arguments: Arguments.MonitorInformation }>) {
  const { display } = props.arguments;

  try {
    const output = YASB.executeCommand(YASB.MONITOR_INFO_COMMAND);

    const monitors = parseMonitorInfo(output);

    let markdown: string;
    if (display === "text") {
      markdown = markdownMonitorInfo(monitors);
    } else {
      markdown = markdownTableMonitorInfo(monitors);
    }

    return <Detail markdown={markdown} />;
  } catch (error) {
    console.error("Error starting YASB:", error);
    return;
  }
}

interface MonitorInfo {
  name?: string;
  resolution?: string;
  position?: string;
  primary?: boolean;
  scaleFactor?: number;
  manufacturer?: string;
  model?: string;
}

function parseMonitorInfo(output: string): MonitorInfo[] {
  const monitors: MonitorInfo[] = [];
  const monitorBlocks = output
    .split("\r\n\r\n")
    .map((block) => block.trim())
    .filter((block) => block.length > 0);

  for (const block of monitorBlocks) {
    const lines = block.split("\n");
    const monitor: MonitorInfo = {};

    for (const line of lines) {
      const [key, value] = line.split(":").map((part) => part.trim());
      switch (key) {
        case "Name":
          monitor.name = value;
          break;
        case "Resolution":
          monitor.resolution = value;
          break;
        case "Position":
          monitor.position = value;
          break;
        case "Primary":
          monitor.primary = value === "Yes";
          break;
        case "Scale Factor":
          monitor.scaleFactor = parseFloat(value);
          break;
        case "Manufacturer":
          monitor.manufacturer = value;
          break;
        case "Model":
          monitor.model = value;
          break;
      }
    }
    monitors.push(monitor);
  }
  return monitors;
}

function markdownMonitorInfo(monitors: MonitorInfo[]): string {
  let markdown = "";
  monitors.forEach((monitor, index) => {
    markdown += `### Monitor ${index + 1}:\n`;
    if (monitor.name) markdown += `- **Name:** ${monitor.name}\n`;
    if (monitor.resolution) markdown += `- **Resolution:** ${monitor.resolution}\n`;
    if (monitor.position) markdown += `- **Position:** ${monitor.position}\n`;
    if (monitor.primary !== undefined) markdown += `- **Primary:** ${monitor.primary ? "Yes" : "No"}\n`;
    if (monitor.scaleFactor !== undefined) markdown += `- **Scale Factor:** ${monitor.scaleFactor.toFixed(2)}\n`;
    if (monitor.manufacturer) markdown += `- **Manufacturer:** ${monitor.manufacturer}\n`;
    if (monitor.model) markdown += `- **Model:** ${monitor.model}\n`;
    markdown += `\n`;
  });
  return markdown;
}

function markdownTableMonitorInfo(monitors: MonitorInfo[]): string {
  let markdown = "| Property |";
  monitors.forEach((_, index) => {
    markdown += ` Monitor ${index + 1} |`;
  });
  markdown += "\n";

  markdown += "|----------|";
  monitors.forEach(() => {
    markdown += "------------|";
  });
  markdown += "\n";

  const properties: Array<[string, keyof MonitorInfo]> = [
    ["Name", "name"],
    ["Resolution", "resolution"],
    ["Position", "position"],
    ["Primary", "primary"],
    ["Scale Factor", "scaleFactor"],
    ["Manufacturer", "manufacturer"],
    ["Model", "model"],
  ];

  properties.forEach(([label, prop]) => {
    markdown += `| ${label} |`;
    monitors.forEach((monitor) => {
      let value = monitor[prop];
      if (prop === "primary") {
        value = value === undefined ? "" : value ? "Yes" : "No";
      } else if (prop === "scaleFactor" && value !== undefined) {
        value = (value as number).toFixed(2);
      }
      markdown += ` ${value ?? ""} |`;
    });
    markdown += "\n";
  });

  return markdown;
}
