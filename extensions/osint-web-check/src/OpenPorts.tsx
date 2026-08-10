import * as net from "node:net";
import { Action, ActionPanel, Detail, List } from "@raycast/api";
import { Fragment } from "react";
import { WebCheckComponentProps } from "./utils/types";
import { useCheckDetail } from "./utils/useCheckDetail";

export function OpenPorts({ url, enabled }: WebCheckComponentProps) {
  const { data, isLoading } = useCheckDetail({ keyPrefix: "open-ports", url, enabled, fetcher: checkPorts });

  return (
    <List.Item
      title="Open Ports"
      actions={
        <ActionPanel>
          <Action.Push title="More Info" target={<Detail markdown={INFO} />} />
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          isLoading={isLoading}
          metadata={
            data && (
              <List.Item.Detail.Metadata>
                {data.openPorts.map((port) => (
                  <List.Item.Detail.Metadata.Label key={port} title="Open Port" text={`Port ${port}`} />
                ))}

                {data.closedPorts.length > 0 && (
                  <Fragment>
                    <List.Item.Detail.Metadata.Separator />
                    {data.closedPorts.map((port) => (
                      <List.Item.Detail.Metadata.Label key={port} title="Closed Port" text={`Port ${port}`} />
                    ))}
                  </Fragment>
                )}
              </List.Item.Detail.Metadata>
            )
          }
        />
      }
    />
  );
}

function checkPort(domain: string, port: number) {
  return new Promise<number | false>((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1500);

    socket.once("connect", () => {
      socket.destroy();
      resolve(port);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, domain);
  });
}

async function checkPorts(url: string) {
  const domain = new URL(url).hostname;

  const openPorts = (await Promise.all(PORTS_TO_CHECK.map((port) => checkPort(domain, port)))).filter(
    (val): val is number => typeof val === "number",
  );
  const closedPorts = new Set(PORTS_TO_CHECK);
  openPorts.forEach((port) => closedPorts.delete(port));

  return { openPorts, closedPorts: [...closedPorts] };
}

const PORTS_TO_CHECK = [
  20, 21, 22, 23, 25, 53, 80, 67, 68, 69, 110, 119, 123, 143, 156, 161, 162, 179, 194, 389, 443, 587, 993, 995, 3000,
  3306, 3389, 5060, 5900, 8000, 8080, 8888,
];

const INFO = `
## Ports

In networking, a port is a numbered endpoint that allows multiple services or applications to run simultaneously on a single device, facilitating communication and data exchange between computers over a network.

The following are commonly-used port numbers and use-cases:

- Port 80: incoming HTTP traffic (unencrypted).
- Port 443: incoming HTTPS traffic (encrypted).
- Port 21: FTP (File Transfer Protocol), transferring files (unencrypted).
- Port 22: SSH, remote-access of a machine.
`.trim();
