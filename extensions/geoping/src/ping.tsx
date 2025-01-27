import { useEffect, useState } from "react";
import { exec } from "child_process";
import { Icon, List, Detail, Color, Image } from "@raycast/api";
import type { Server, PingResult, Row } from "./types";
import { regions, flags } from "./servers";

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
  console.log(`Pinging ${server.hostName}...`);
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
}

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

async function getPingResults(updatePingResults: (result: Row) => void): Promise<void> {
  console.log(`Pinging ${regions.length} servers...`);
  for (const promise of pingPromises) {
    const result = await promise;
    updatePingResults(result);
  }
}

export default function Command() {
  const [pingResults, setPingResults] = useState([] as Row[]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPingResults() {
      try {
        await getPingResults((result: Row) => {
          setPingResults((prevResults) => {
            // check if the result is already in the list
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
        setError("Failed to fetch ping results");
        console.error(err);
      }
    }
    fetchPingResults();
  }, []);

  if (error) {
    return (
      <List>
        <List.Item title="Error" subtitle={error} />
      </List>
    );
  }

  return (
    <>
      {pingResults.length === 0 ? (
        <Detail markdown={`## Pinging servers...`} />
      ) : pingResults.every((result) => result.unreachable !== null) ? (
        <Detail markdown={`**All servers are offline!**`} />
      ) : (
        <List>
          {pingResults.map((result, index) => (
            <List.Item
              key={index}
              icon={generateIcon(result)}
              title={`${flags[result.region.country] || ""}  ${result.region.name}`}
              subtitle={`${result.region.country} (${result.region.code.toUpperCase()})`}
              accessories={[
                {
                  text: `${result.unreachable ? "(?)" : result.latency.toFixed()}ms`,
                },
              ]}
            />
          ))}
        </List>
      )}
    </>
  );
}
