import { useEffect, useState } from "react";
import { exec } from "child_process";
import { Icon, List, Color, Image, Action, ActionPanel } from "@raycast/api";
import type { Server, PingResult, Row } from "./types";
import { regions, flags, Country } from "./servers";
import { showFailureToast } from "@raycast/utils";

function generateIcon(result: Row): Image.ImageLike {
  if (result.unreachable) {
    return {
      source: Icon.Signal0,
      tintColor: Color.Red,
    };
  }
  if (result.latency < 100) {
    return { source: Icon.FullSignal, tintColor: Color.Green };
  } else if (result.latency < 200) {
    return {
      source: Icon.Signal3,
      tintColor: Color.Yellow,
    };
  } else if (result.latency < 300) {
    return {
      source: Icon.Signal2,
      tintColor: Color.Orange,
    };
  } else {
    return {
      source: Icon.Signal1,
      tintColor: Color.Orange,
    };
  }
}

async function ping(server: Server): Promise<PingResult> {
  try {
    return new Promise((resolve) => {
      exec(`/sbin/ping -c 1 ${server.ipv4}`, (error, stdout) => {
        if (error) {
          resolve({ latency: 99999, error: error.toString() });
        } else {
          const time = stdout.match(/time=(\d+\.\d+)/);

          resolve({
            latency: time ? parseInt(time[1]) : 9999,
            error: null,
          });
        }
      });
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    showFailureToast(error, { title: `Pinging server at ${server.name} failed` });
    return new Promise((resolve) => {
      resolve({ latency: 99999, error: errorMessage });
    });
  }
}

async function getPingResults(updatePingResults: (result: Row) => void): Promise<void> {
  const pingPromises = regions.map(async (region) => {
    const randomServer = region.servers[Math.floor(Math.random() * region.servers.length)];
    const result = await ping(randomServer);
    return {
      latency: result.latency,
      region: region,
      server: randomServer,
      unreachable: result.error,
    };
  });

  for (const promise of pingPromises) {
    const result = await promise;
    updatePingResults(result);
  }
}

export default function Command() {
  const [pingResults, setPingResults] = useState([] as Row[]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    setIsLoading(true);
    setPingResults([]);
    setError(null);
    try {
      await getPingResults((result: Row) => {
        setPingResults((prevResults) => {
          const existingResult = prevResults.find((r) => r.region.name === result.region.name);
          if (existingResult) {
            return prevResults.map((r) => (r.region.name === result.region.name ? result : r));
          }

          const updatedResults = [...prevResults, result];
          updatedResults.sort((a, b) => a.latency - b.latency);
          return updatedResults;
        });
      });
    } catch (err) {
      setError("Failed to ping servers");
      showFailureToast(err, { title: "Failed to ping servers" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  if (error) {
    return (
      <List
        isLoading={false}
        actions={
          <ActionPanel>
            <Action title="Refresh" onAction={refresh} icon={Icon.ArrowClockwise} />
          </ActionPanel>
        }
      >
        <List.Item
          title={error}
          icon={{
            source: Icon.Warning,
            tintColor: Color.Red,
          }}
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading}>
      {pingResults.map((result, index) => (
        <List.Item
          key={index}
          icon={generateIcon(result)}
          title={`${flags[result.region.country as Country] || ""}  ${result.region.name}`}
          subtitle={`${result.region.country} (${result.region.code.toUpperCase()})`}
          accessories={[
            {
              text: `${result.unreachable ? "Unreachable" : result.latency.toFixed() + "ms"}`,
            },
          ]}
          actions={
            <ActionPanel>
              <Action title="Refresh" onAction={refresh} icon={Icon.ArrowClockwise} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
