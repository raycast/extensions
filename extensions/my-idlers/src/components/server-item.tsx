import { Action, ActionPanel, Form, Icon, List } from "@raycast/api";
import { Item, Server, ServerType } from "../types";
import PriceListItem from "./price-list-item";
import NextDueDate from "./next-due-date";
import { numOrUnlimited } from "../utils";
import { showFailureToast, useForm } from "@raycast/utils";
import { useState } from "react";
import useGet, { usePut } from "../hooks";

export default function ServerItem({ server }: { server: Server }) {
  return (
    <List.Item
      icon={Icon.HardDrive}
      title={server.hostname}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Hostname" text={server.hostname} />
              <List.Item.Detail.Metadata.Label title="Type" text={ServerType[server.server_type]} />
              <List.Item.Detail.Metadata.Label title="OS" text={server.os.name} />
              <List.Item.Detail.Metadata.Label title="Location" text={server.location.name} />
              <List.Item.Detail.Metadata.Label title="Provider" text={server.provider.name} />
              <PriceListItem price={server.price} />
              <NextDueDate date={server.price.next_due_date} />
              <List.Item.Detail.Metadata.Label title="CPU" text={server.cpu.toString()} />
              <List.Item.Detail.Metadata.Label title="RAM" text={`${server.ram} ${server.ram_type}`} />
              <List.Item.Detail.Metadata.Label title="Disk" text={`${server.disk} ${server.disk_type}`} />
              <List.Item.Detail.Metadata.Label
                title="Bandwidth"
                text={`${numOrUnlimited(server.bandwidth, "Unmetered")} GB`}
              />
              <List.Item.Detail.Metadata.TagList title="IPv4">
                {server.ips
                  .filter((ip) => ip.is_ipv4)
                  .map((ip) => (
                    <List.Item.Detail.Metadata.TagList.Item key={ip.address} text={ip.address} />
                  ))}
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.TagList title="IPv6">
                {server.ips
                  .filter((ip) => !ip.is_ipv4)
                  .map((ip) => (
                    <List.Item.Detail.Metadata.TagList.Item key={ip.address} text={ip.address} />
                  ))}
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Label title="Was promo" text={server.was_promo === 0 ? "No" : "Yes"} />
              <List.Item.Detail.Metadata.Label title="Owned since" text={server.owned_since} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={<ActionPanel>
        <Action.Push icon={Icon.Pencil} title="Update Server" target={<EditServer server={server} />} />
      </ActionPanel>}
    />
  );
}

function EditServer({ server }: { server: Server }) {
  const [execute, setExecute] = useState(false);
  const { isLoading: isLoadingProviders, data: providers } = useGet<Item>("providers")

  type EditServer = {
    hostname: string;
    provider_id: string;
    active: boolean;
  }
  const {handleSubmit, itemProps, values} = useForm<EditServer>({
    onSubmit() {
      setExecute(true);
    },
    initialValues: {
      hostname: server.hostname,
      provider_id: server.provider_id.toString(),
      active: !!server.active 
    }
  })

  const { isLoading } = usePut(`servers/${server.id}`, {
    execute,
    body: values,
    onError(error) {
      showFailureToast(error);
      setExecute(false);
    },
  })

  return <Form isLoading={isLoadingProviders || isLoading} actions={<ActionPanel>
    <Action.SubmitForm icon={Icon.Check} title="Update Server" onSubmit={handleSubmit} />
  </ActionPanel>}>

    {/* "show_public": 0, */}
    <Form.TextField title="Hostname" placeholder={server.hostname} {...itemProps.hostname} />
    {/* "server_type": 1, */}
    {/* "os_id": 2, */}
    {/* "ns1": "ns1",
    "ns2": "ns2", */}
    {/* "ssh_port": 22, */}
    <Form.Dropdown title="Provider" {...itemProps.provider_id}>
      {providers.map(provider => <Form.Dropdown.Item key={provider.id} title={provider.name} value={provider.id.toString()} />)}
    </Form.Dropdown>
    {/* "location_id": 15,
    "bandwidth": 2000,
    "ram": 2024,
    "ram_type": "MB",
    "ram_as_mb": 2024,
    "disk": 30,
    "disk_type": "GB",
    "disk_as_gb": 30,
    "cpu": 2,
    "has_yabs": 0,
    "was_promo": 1,
    "owned_since": "2022-01-01" */}
    <Form.Checkbox label="I still have this server" {...itemProps.active} />
  </Form>
}