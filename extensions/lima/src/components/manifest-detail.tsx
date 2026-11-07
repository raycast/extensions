import { Color, Icon, List } from "@raycast/api";
import { Pending, statusColor, vmTypeLabel } from "../lib/instance";
import { Manifest, manifestStatus } from "../lib/manifests";
import { cap, capPath } from "./instance-detail";

/** Per list, so the panel stays readable for a manifest with many mounts. */
const ROWS_PER_LIST = 5;

/** "2 scripts · system, user". */
function scripts(modes: string[]): string {
  if (!modes.length) return "None";
  return `${modes.length} ${modes.length === 1 ? "script" : "scripts"} · ${[...new Set(modes)].join(", ")}`;
}

/** What the file says, and how its instance is doing. Sizes the file leaves out come from what it builds on. */
export function ManifestDetail({ manifest, pending }: { manifest: Manifest; pending?: Pending }) {
  const { content, instance } = manifest;
  const status = manifestStatus(manifest);
  const ssh =
    instance?.status === "Running" && instance.sshLocalPort
      ? `${instance.sshAddress ?? "127.0.0.1"}:${instance.sshLocalPort}`
      : undefined;
  const fromBase = content?.base.length ? "From Base" : "Lima Default";

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Manifest" text={manifest.file} icon={Icon.Document} />
          <List.Item.Detail.Metadata.Label title="Instance" text={manifest.name} />
          <List.Item.Detail.Metadata.TagList title="Status">
            <List.Item.Detail.Metadata.TagList.Item
              text={pending ? `${pending}...` : status}
              color={statusColor(status)}
            />
            {manifest.changed && <List.Item.Detail.Metadata.TagList.Item text="Changed" color={Color.Orange} />}
          </List.Item.Detail.Metadata.TagList>
          {ssh && <List.Item.Detail.Metadata.Label title="SSH" text={ssh} />}
          <List.Item.Detail.Metadata.Separator />
          {manifest.error && (
            <List.Item.Detail.Metadata.Label title="Error" text={cap(manifest.error)} icon={Icon.Warning} />
          )}
          {content && (
            <>
              <List.Item.Detail.Metadata.Label title="Builds On" text={content.base.join(", ") || "Nothing"} />
              <List.Item.Detail.Metadata.Label title="CPUs" text={content.cpus ? String(content.cpus) : fromBase} />
              <List.Item.Detail.Metadata.Label
                title="Memory"
                text={content.memory ? `${content.memory} GiB` : fromBase}
              />
              <List.Item.Detail.Metadata.Label title="Disk" text={content.disk ? `${content.disk} GiB` : fromBase} />
              {content.vmType && <List.Item.Detail.Metadata.Label title="VM Type" text={vmTypeLabel(content.vmType)} />}
              <List.Item.Detail.Metadata.Separator />
              {content.mounts.length === 0 && <List.Item.Detail.Metadata.Label title="Mounts" text={fromBase} />}
              {content.mounts.slice(0, ROWS_PER_LIST).map((mount, index) => (
                <List.Item.Detail.Metadata.Label
                  key={mount.location}
                  title={index === 0 ? "Mounts" : ""}
                  text={capPath(mount.location)}
                  icon={mount.writable ? Icon.Pencil : Icon.Lock}
                />
              ))}
              {content.ports.slice(0, ROWS_PER_LIST).map((port, index) => (
                <List.Item.Detail.Metadata.Label
                  key={`${port.guest}:${port.host}`}
                  title={index === 0 ? "Ports" : ""}
                  text={`${port.guest} → ${port.host}`}
                />
              ))}
              {content.volumes.map((name, index) => (
                <List.Item.Detail.Metadata.Label
                  key={`volume:${name}`}
                  title={index === 0 ? "Volumes" : ""}
                  text={name}
                  icon={Icon.HardDrive}
                />
              ))}
              <List.Item.Detail.Metadata.Label title="Provision" text={scripts(content.provisions)} />
            </>
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="File" text={capPath(manifest.path)} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
