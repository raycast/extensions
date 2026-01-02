import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { Currency, Item, Label, Server, ServerType, Term } from "../types";
import PriceListItem from "./price-list-item";
import NextDueDate from "./next-due-date";
import { addServer, deleteServer, numOrUnlimited } from "../utils";
import { FormValidation, MutatePromise, showFailureToast, useForm } from "@raycast/utils";
import { useState } from "react";
import useGet, { usePut } from "../hooks";
import dayjs from "dayjs";

export default function ServerItem({ server, mutate }: { server: Server; mutate: MutatePromise<Server[]> }) {
  async function confirmAndDeleteServer(server: Server) {
    const options: Alert.Options = {
      icon: { source: Icon.Trash, tintColor: Color.Red },
      title: `Delete "${server.hostname}"?`,
      message: "Are you sure you want to delete this?",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    };

    if (await confirmAlert(options)) {
      const toast = await showToast(Toast.Style.Animated, "Deleting server", server.hostname);
      try {
        await mutate(deleteServer(server), {
          optimisticUpdate(data) {
            return data.filter((s) => s.id !== server.id);
          },
        });
        toast.style = Toast.Style.Success;
        toast.title = "Deleted server";
      } catch {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not delete";
      }
    }
  }

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
          <Action.Push icon={Icon.Plus} title="Add Server" target={<AddServer mutate={mutate} />} />
          <Action
            icon={Icon.Trash}
            title="Delete Server"
            onAction={() => confirmAndDeleteServer(server)}
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.Remove}
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

function AddServer({ mutate }: { mutate: MutatePromise<Server[]> }) {
  const [isAdding, setIsAdding] = useState(false);
  const { isLoading: isLoadingProviders, data: providers } = useGet<Item>("providers");
  const { isLoading: isLoadingLocations, data: locations } = useGet<Item>("locations");
  const { isLoading: isLoadingOS, data: os } = useGet<Item>("os");
  const { isLoading: isLoadingLabels, data: labels } = useGet<Label>("labels");
  const { pop } = useNavigation();

  type AddServer = {
    hostname: string;
    server_type: string;
    os_id: string;
    ip1: string;
    ip2: string;
    ns1: string;
    ns2: string;
    ssh_port: string;
    bandwidth: string;
    was_promo: string;
    provider_id: string;
    price: string;
    payment_term: string;
    currency: string;
    ram: string;
    ram_type: string;
    disk: string;
    disk_type: string;
    cpu: string;
    location_id: string;
    owned_since: Date | null;
    next_due_date: Date | null;
    labels: string[];
    show_public: boolean;
  };
  const { handleSubmit, itemProps } = useForm<AddServer>({
    async onSubmit(values) {
      setIsAdding(true);
      try {
        const ram = +values.ram;
        const disk = +values.disk;
        const body = {
          ...values,
          active: 1,
          price: +values.price,
          owned_since: values.owned_since?.toISOString().split("T")[0],
          next_due_date: values.next_due_date?.toISOString().split("T")[0],
          show_public: +values.show_public as Server["show_public"],
          ram,
          ram_as_mb: values.ram_type === "MB" ? ram : ram * 1024,
          disk,
          disk_as_gb: values.disk_type === "GB" ? disk : disk * 1024,
        };
        await mutate(addServer(body));
        pop();
      } catch (error) {
        await showFailureToast(error);
      } finally {
        setIsAdding(false);
      }
    },
    initialValues: {
      price: "2.50",
      ssh_port: "22",
      bandwidth: "1000",
      ram: "2024",
      disk: "10",
      cpu: "2",
      owned_since: new Date(),
      next_due_date: dayjs(new Date()).add(365, "day").toDate(),
    },
    validation: {
      hostname: FormValidation.Required,
      ip1: FormValidation.Required,
      ip2: FormValidation.Required,
      owned_since: FormValidation.Required,
      next_due_date: FormValidation.Required,
    },
  });

  const isLoading = isLoadingProviders || isLoadingLocations || isLoadingOS || isLoadingLabels || isAdding;

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Items > Add Server"
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Add Server" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Hostname" placeholder="Enter server.hostname" {...itemProps.hostname} />
      <Form.Dropdown title="Server type" {...itemProps.server_type}>
        {Object.entries(ServerType)
          .filter(([key]) => isNaN(Number(key)))
          .map(([key, val]) => (
            <Form.Dropdown.Item key={key} title={key} value={val.toString()} />
          ))}
      </Form.Dropdown>
      <Form.Dropdown title="OS" {...itemProps.os_id}>
        {os.map((item) => (
          <Form.Dropdown.Item key={item.id} title={item.name} value={item.id.toString()} />
        ))}
      </Form.Dropdown>
      <Form.TextField title="IP 1" {...itemProps.ip1} />
      <Form.TextField title="IP 2" {...itemProps.ip2} />
      <Form.TextField title="NS1" {...itemProps.ns1} />
      <Form.TextField title="NS2" {...itemProps.ns2} />
      <Form.TextField title="SSH" {...itemProps.ssh_port} />
      <Form.TextField title="Bandwidth GB" {...itemProps.bandwidth} />
      <Form.Dropdown title="Promo price" {...itemProps.was_promo}>
        <Form.Dropdown.Item title="Yes" value="1" />
        <Form.Dropdown.Item title="No" value="0" />
      </Form.Dropdown>
      <Form.Dropdown title="Provider" {...itemProps.provider_id}>
        {providers.map((provider) => (
          <Form.Dropdown.Item key={provider.id} title={provider.name} value={provider.id.toString()} />
        ))}
      </Form.Dropdown>
      <Form.TextField title="Price" {...itemProps.price} />
      <Form.Dropdown title="Term" {...itemProps.payment_term}>
        {Object.entries(Term)
          .filter(([key]) => isNaN(Number(key)))
          .map(([key, val]) => (
            <Form.Dropdown.Item key={key} title={key} value={val.toString()} />
          ))}
      </Form.Dropdown>
      <Form.Dropdown title="Currency" {...itemProps.currency}>
        {Object.entries(Currency)
          .filter(([key]) => isNaN(Number(key)))
          .map(([key, val]) => (
            <Form.Dropdown.Item key={key} title={key} value={val} />
          ))}
      </Form.Dropdown>
      <Form.TextField title="RAM" {...itemProps.ram} />
      <Form.Dropdown title="RAM type" {...itemProps.ram_type}>
        <Form.Dropdown.Item title="MB" value="MB" />
        <Form.Dropdown.Item title="GB" value="GB" />
      </Form.Dropdown>
      <Form.TextField title="Disk" {...itemProps.disk} />
      <Form.Dropdown title="Disk type" {...itemProps.disk_type}>
        <Form.Dropdown.Item title="GB" value="GB" />
        <Form.Dropdown.Item title="TB" value="TB" />
      </Form.Dropdown>
      <Form.TextField title="CPU" {...itemProps.cpu} />
      <Form.Dropdown title="Location" {...itemProps.location_id}>
        {locations.map((location) => (
          <Form.Dropdown.Item key={location.id} title={location.name} value={location.id.toString()} />
        ))}
      </Form.Dropdown>
      <Form.DatePicker title="Owned since" type={Form.DatePicker.Type.Date} {...itemProps.owned_since} />
      <Form.DatePicker title="Next due date" type={Form.DatePicker.Type.Date} {...itemProps.next_due_date} />
      <Form.TagPicker title="Label" {...itemProps.labels}>
        {labels.map((label) => (
          <Form.TagPicker.Item key={label.id} title={label.label} value={label.id.toString()} />
        ))}
      </Form.TagPicker>
      <Form.Checkbox label="Allow some of this data to be public" {...itemProps.show_public} />
    </Form>
  );
}
