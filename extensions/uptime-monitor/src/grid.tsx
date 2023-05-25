import {
  environment,
  ActionPanel,
  List,
  Action,
  updateCommandMetadata,
  Detail,
  launchCommand,
  LaunchType,
  showHUD,
} from "@raycast/api";
import { useEffect, useState } from "react";
import fs from "fs";
import path from "path";

const dataDir = path.join(environment.supportPath, `data/https:/`);

interface StatusCounts {
  Online: number;
  Offline: number;
}

interface MonitorStatus {
  name: string;
  responseTime: string;
  averageResponseTime: string;
  lastCheck: number;
  url: string;
  uptime: number;
  statusCounts: StatusCounts;
}

const getMonitorStatus = (filename: string) => {
  const filepath = path.resolve(dataDir, filename);
  const content = fs.readFileSync(filepath, "utf-8");
  const lines = content
    .trim()
    .split("\n")
    .map((line) => {
      // Use array destructuring to get the url from the last element
      const [timestamp, name, responseTime, url] = line.split(", ");
      return {
        timestamp: Number(timestamp),
        name,
        responseTime: Number.parseInt(responseTime),
        url, // Add url as a property of the returned object
      };
    });
  const currentTime = Math.floor(Date.now() / 1000);
  const lastLine = lines[lines.length - 1];
  // Use lastLine.url instead of filename to get the url
  const successfulChecks = lines.filter((line) => line.responseTime > 0);
  const averageResponseTime =
    successfulChecks.reduce((sum, line) => sum + line.responseTime, 0) / successfulChecks.length;

  const statusCounts = lines.reduce(
    (acc: StatusCounts, line) => {
      const status = line.responseTime > 0 ? "Online" : "Offline";
      acc[status]++;
      return acc;
    },
    { Online: 0, Offline: 0 } // initial value of the accumulator
  );

  // Check if lastLine.responseTime is NaN
  const responseTime = Number.isNaN(lastLine.responseTime) ? "Offline" : `${lastLine.responseTime}ms`;

  return {
    name: lastLine.name,
    responseTime: responseTime,
    averageResponseTime: `${Math.round(averageResponseTime)}ms`,
    lastCheck: Math.round(currentTime - lastLine.timestamp / 1000),
    url: lastLine.url,
    uptime: Math.round((successfulChecks.length / lines.length) * 100),
    statusCounts,
  };
};

export default function UptimeMonitor() {
  // Add useState hooks for monitors, showingDetail and outages
  const [monitors, setMonitors] = useState<MonitorStatus[]>([]);
  const [showingDetail, setShowingDetail] = useState(true);

  // Check if the data directory exists
  if (!fs.existsSync(dataDir)) {
    // If not, update the command metadata with an error message
    updateCommandMetadata({ subtitle: "Please Add A Monitor First" });
    // Return early and do not render the list
    return <Detail markdown={`You need to add a monitor first before you can see the dashboard.😉`} />;
  }

  // Otherwise, continue with the rest of the code
  const files = fs.readdirSync(dataDir).filter((file) => file.endsWith(".txt"));
  if (files.length === 0) {
    updateCommandMetadata({ subtitle: "Please Add A Monitor First" });
    return <Detail markdown={`You need to add a monitor first before you can see the dashboard.😉`} />;
  }

  // Use useEffect hook to call setMonitors function once
  useEffect(() => {
    const data = files.map(getMonitorStatus);
    setMonitors(data);
  }, []); // Pass an empty array as dependency to run only once

  return (
    <List searchBarPlaceholder="Filter Monitors" isShowingDetail={showingDetail}>
      {monitors.map((monitor) => (
        <List.Item
          key={monitor.name || "Unknown"} // Pass a unique key here
          title={monitor.name || "Unknown"}
          subtitle={monitor.responseTime}
          accessoryTitle={`${monitor.lastCheck}s ago`}
          detail={
            <List.Item.Detail
              markdown={`![Favicon](https://www.google.com/s2/favicons?domain=${monitor.url})   ${
                monitor.url
              }\n\nUptime: ${monitor.uptime}%\n\nAverage Response Time: ${
                monitor.averageResponseTime
              }\n\nStatus Counts:\n- Online: ${monitor.statusCounts.Online || 0}\n- Offline: ${
                monitor.statusCounts.Offline || 0
              }

                Outage History: Coming Soon`}
            />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={monitor.url} />
              <Action
                title={showingDetail ? "Hide Detail" : "Show Detail"}
                onAction={() => setShowingDetail(!showingDetail)}
              />
              <Action
                title={showingDetail ? "Ping All Monitors" : "Ping All Monitors"}
                onAction={() => launchCommand({ name: "background", type: LaunchType.Background })}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
