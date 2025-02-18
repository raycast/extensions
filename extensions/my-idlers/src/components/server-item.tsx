import { Action, ActionPanel, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { Item, Server, ServerType } from "../types";
import PriceListItem from "./price-list-item";
import NextDueDate from "./next-due-date";
import { numOrUnlimited } from "../utils";
import { MutatePromise, showFailureToast, useForm } from "@raycast/utils";
import { useState } from "react";
import useGet, { usePut } from "../hooks";

export default function ServerItem({ server, mutate }: { server: Server; mutate: MutatePromise<Server[]> }) {
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
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.Pencil}
            title="Update Server"
            target={<EditServer server={server} mutate={mutate} />}
          />
        </ActionPanel>
      }
    />
  );
}

function EditServer({ server, mutate }: { server: Server; mutate: MutatePromise<Server[]> }) {
  const [execute, setExecute] = useState(false);
  const { isLoading: isLoadingProviders, data: providers } = useGet<Item>("providers");
  const { isLoading: isLoadingLocations, data: locations } = useGet<Item>("locations");
  const { isLoading: isLoadingOS, data: os } = useGet<Item>("os");
  const { pop } = useNavigation();

  type EditServer = {
    hostname: string;
    os_id: string;
    provider_id: string;
    cpu: string;
    ram: string;
    ram_type: string;
    disk: string;
    disk_type: string;
    location_id: string;
    owned_since: Date | null;
    active: boolean;
    show_public: boolean;
  };
  const { handleSubmit, itemProps, values } = useForm<EditServer>({
    onSubmit() {
      setExecute(true);
    },
    initialValues: {
      hostname: server.hostname,
      os_id: server.os_id.toString(),
      provider_id: server.provider_id.toString(),
      cpu: server.cpu.toString(),
      ram: server.ram.toString(),
      ram_type: server.ram_type,
      disk: server.disk.toString(),
      disk_type: server.disk_type,
      location_id: server.location_id.toString(),
      owned_since: new Date(server.owned_since),
      active: !!server.active,
      show_public: !!server.show_public,
    },
  });

  const body = {
    ...values,
    owned_since: values.owned_since?.toISOString().split("T")[0],
    active: +values.active as Server["active"],
    show_public: +values.show_public as Server["show_public"],
  };
  const { isLoading: isUpdating } = usePut(`servers/${server.id}`, {
    execute,
    body,
    onData() {
      mutate(undefined, {
        optimisticUpdate(data) {
          const index = data.findIndex((s) => s.id === server.id);
          const newData = [...data];
          newData[index] = { ...server, ...body } as unknown as Server;
          return newData;
        },
      });
      showToast(Toast.Style.Success, "Updated server", server.id);
      pop();
    },
    onError(error) {
      showFailureToast(error);
      setExecute(false);
    },
  });

  const isLoading = isLoadingProviders || isLoadingLocations || isLoadingOS || isUpdating;

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Items > Update Server"
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Update Server" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Server ID" text={server.id} />
      <Form.TextField title="Hostname" placeholder={server.hostname} {...itemProps.hostname} />
      <Form.Dropdown title="OS" {...itemProps.os_id}>
        {os.map((item) => (
          <Form.Dropdown.Item key={item.id} title={item.name} value={item.id.toString()} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title="Provider" {...itemProps.provider_id}>
        {providers.map((provider) => (
          <Form.Dropdown.Item key={provider.id} title={provider.name} value={provider.id.toString()} />
        ))}
      </Form.Dropdown>
      <Form.TextField title="CPU" placeholder={server.cpu.toString()} {...itemProps.cpu} />
      <Form.TextField title="RAM" placeholder={server.ram.toString()} {...itemProps.ram} />
      <Form.Dropdown title="RAM type" {...itemProps.ram_type}>
        <Form.Dropdown.Item title="MB" value="MB" />
        <Form.Dropdown.Item title="GB" value="GB" />
      </Form.Dropdown>
      <Form.TextField title="Disk" placeholder={server.disk.toString()} {...itemProps.disk} />
      <Form.Dropdown title="Disk type" {...itemProps.disk_type}>
        <Form.Dropdown.Item title="GB" value="GB" />
        <Form.Dropdown.Item title="TB" value="TB" />
      </Form.Dropdown>
      <Form.Dropdown title="Location" {...itemProps.location_id}>
        {locations.map((location) => (
          <Form.Dropdown.Item key={location.id} title={location.name} value={location.id.toString()} />
        ))}
      </Form.Dropdown>
      <Form.DatePicker title="Owned since" type={Form.DatePicker.Type.Date} {...itemProps.owned_since} />
      <Form.Checkbox label="I still have this server" {...itemProps.active} />
      <Form.Checkbox label="Allow some of this data to be public" {...itemProps.show_public} />
    </Form>
  );
}
