import { Icon, List } from "@raycast/api";
import { gib, Instance, Pending, statusColor, tildify, vmTypeLabel, volumeNames } from "../lib/instance";

/** Per list, so the panel stays readable for an instance with many mounts. */
const ROWS_PER_LIST = 5;

/** The most characters a value shows, so long values all end at the same place, clear of their labels. */
const MAX_VALUE = 40;

/** Cuts a path from the front, since its end says more: "...code/project". */
export function capPath(path: string): string {
  const short = tildify(path);
  return short.length <= MAX_VALUE ? short : `...${short.slice(short.length - MAX_VALUE + 3)}`;
}

export function cap(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= MAX_VALUE ? flat : `${flat.slice(0, MAX_VALUE - 3).trimEnd()}...`;
}

// Metadata only: with Markdown, Raycast gives it the top of the panel and pushes the metadata down.
export function InstanceDetail({
  instance,
  pending,
  manifest,
}: {
  instance: Instance;
  pending?: Pending;
  /** The file in the Manifests Folder the instance is named after, like dev.yaml. */
  manifest?: string;
}) {
  const mounts = instance.config?.mounts ?? [];
  const forwards = (instance.config?.portForwards ?? []).filter((forward) => forward.guestPort || forward.hostPort);
  const ssh =
    instance.status === "Running" && instance.sshLocalPort
      ? `${instance.sshAddress ?? "127.0.0.1"}:${instance.sshLocalPort}`
      : undefined;

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Instance" text={instance.name} />
          <List.Item.Detail.Metadata.TagList title="Status">
            <List.Item.Detail.Metadata.TagList.Item
              text={pending ? `${pending}...` : instance.status}
              color={statusColor(instance.status)}
            />
            {instance.protected && <List.Item.Detail.Metadata.TagList.Item text="Protected" />}
          </List.Item.Detail.Metadata.TagList>
          {manifest && <List.Item.Detail.Metadata.Label title="Manifest" text={manifest} icon={Icon.Document} />}
          {instance.errors?.map((error, index) => (
            <List.Item.Detail.Metadata.Label
              key={error}
              title={index === 0 ? "Errors" : ""}
              text={cap(error)}
              icon={Icon.Warning}
            />
          ))}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="System"
            text={[instance.config?.os, instance.arch].filter(Boolean).join(" · ")}
          />
          <List.Item.Detail.Metadata.Label title="VM Type" text={vmTypeLabel(instance.vmType)} />
          <List.Item.Detail.Metadata.Label title="CPUs" text={String(instance.cpus)} icon={Icon.ComputerChip} />
          <List.Item.Detail.Metadata.Label title="Memory" text={gib(instance.memory)} icon={Icon.MemoryChip} />
          <List.Item.Detail.Metadata.Label title="Disk" text={gib(instance.disk)} icon={Icon.HardDrive} />
          <List.Item.Detail.Metadata.Separator />
          {ssh && <List.Item.Detail.Metadata.Label title="SSH" text={ssh} />}
          {volumeNames(instance).map((name, index) => (
            <List.Item.Detail.Metadata.Label
              key={`volume:${name}`}
              title={index === 0 ? "Volumes" : ""}
              text={name}
              icon={Icon.HardDrive}
            />
          ))}
          {mounts.length === 0 && <List.Item.Detail.Metadata.Label title="Mounts" text="None" />}
          {mounts.slice(0, ROWS_PER_LIST).map((mount, index) => (
            <List.Item.Detail.Metadata.Label
              key={mount.location}
              // The heading names the first mount only, so the column reads as a list.
              title={index === 0 ? "Mounts" : ""}
              text={capPath(mount.location)}
              icon={mount.writable ? Icon.Pencil : Icon.Lock}
            />
          ))}
          {mounts.length > ROWS_PER_LIST && (
            <List.Item.Detail.Metadata.Label title="" text={`${mounts.length - ROWS_PER_LIST} more`} />
          )}
          {forwards.slice(0, ROWS_PER_LIST).map((forward, index) => (
            <List.Item.Detail.Metadata.Label
              key={`${forward.guestPort}:${forward.hostPort}`}
              title={index === 0 ? "Ports" : ""}
              text={`${forward.guestPort ?? "any"} → ${forward.hostPort ?? forward.guestPort ?? "any"}`}
            />
          ))}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Folder" text={capPath(instance.dir)} />
          {instance.limaVersion && <List.Item.Detail.Metadata.Label title="Lima" text={instance.limaVersion} />}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
