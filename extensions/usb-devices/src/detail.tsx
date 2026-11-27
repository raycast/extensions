import { Action, ActionPanel, Clipboard, Color, Detail, Icon, List, showToast } from "@raycast/api";
import type { HubPairing } from "./hubs";
import {
  CATEGORY_STYLE,
  CLASS_NAMES,
  Category,
  bcdToString,
  categoryForInterface,
  hex2,
  hex4,
  interfaceLabel,
  paleFor,
  paleOf,
  speedFrom,
  usbVersionColor,
} from "./lookups";
import { bps, bytes, json, label, linkDowngraded, vidpid } from "./format";
import type { UsbDevice } from "./usb";

// ---------- tags ----------

export function categoryTags(d: UsbDevice) {
  return d.categories.map((c) => (
    <List.Item.Detail.Metadata.TagList.Item
      key={c}
      text={c}
      color={CATEGORY_STYLE[c].color}
      icon={CATEGORY_STYLE[c].icon}
      onAction={copy(c)}
    />
  ));
}

export function linkTags(d: UsbDevice) {
  const s = speedFrom(d.speedCode, d.linkBps);
  const tags = [];
  if (s)
    tags.push(<List.Item.Detail.Metadata.TagList.Item key="s" text={s.rate} color={s.color} onAction={copy(s.rate)} />);
  if (d.bcdUSB !== undefined)
    tags.push(
      <List.Item.Detail.Metadata.TagList.Item
        key="v"
        text={`USB ${bcdToString(d.bcdUSB)}`}
        color={usbVersionColor(d.bcdUSB)}
        onAction={copy(`USB ${bcdToString(d.bcdUSB)}`)}
      />,
    );
  if (linkDowngraded(d))
    tags.push(
      <List.Item.Detail.Metadata.TagList.Item
        key="w"
        text="Running below its max speed"
        color={Color.Orange}
        icon={Icon.Warning}
        onAction={copy("Running below its max speed")}
      />,
    );
  return tags;
}

// ---------- detail pane ----------

/** Stable identity for remembering per-device choices (location changes when replugged elsewhere). */
export const deviceId = (d: UsbDevice) => `${hex4(d.vendorId)}:${hex4(d.productId)}:${d.serial ?? d.name}`;

/** Downstream of a merged hub = children of both halves; a child hub's USB 2 half folds into its USB 3 half. */
export function childrenOf(h: UsbDevice, all: UsbDevice[], pairing: HubPairing): UsbDevice[] {
  return all.filter((x) => pairing.canon(x.parentKey) === pairing.canon(h.key) && pairing.canon(x.key) === x.key);
}

/** Metadata text isn't selectable in Raycast, so every pill copies on click (except device pills, which jump). */
export const copy = (text: string) => async () => {
  await Clipboard.copy(text);
  showToast({ title: "Copied", message: text });
};

export function CopyValue({ title, text, value, icon }: { title: string; text: string; value?: string; icon?: Icon }) {
  return (
    <List.Item.Detail.Metadata.TagList title={title}>
      <List.Item.Detail.Metadata.TagList.Item
        text={text}
        icon={icon}
        color={Color.PrimaryText}
        onAction={copy(value ?? text)}
      />
    </List.Item.Detail.Metadata.TagList>
  );
}

export function DeviceDetail({
  d,
  all,
  pairing,
  onSelect,
  iconOf,
}: {
  d: UsbDevice;
  all: UsbDevice[];
  pairing: HubPairing;
  onSelect?: (key: string) => void;
  iconOf: (d: UsbDevice) => Category | undefined;
}) {
  const M = List.Item.Detail.Metadata;
  const twin = pairing.twinOf(d.key);
  const children = childrenOf(d, all, pairing);

  // Ancestors from the Mac down to the direct parent (merged hubs resolved to one entry).
  const ancestors: UsbDevice[] = [];
  for (let k = pairing.canon(d.parentKey); k;) {
    const p = all.find((x) => x.key === k);
    if (!p) break;
    ancestors.unshift(p);
    k = pairing.canon(p.parentKey);
  }
  const speed = speedFrom(d.speedCode, d.linkBps);

  return (
    <List.Item.Detail
      metadata={
        <M>
          <CopyValue title="Name" text={label(d)} />
          {d.vendor ? (
            <CopyValue title={d.vendorFromTable ? "Vendor (from vendor ID)" : "Vendor"} text={d.vendor} />
          ) : (
            <M.Label title="Vendor" text="Not reported" />
          )}
          <M.TagList title="Type">
            {d.categories.length ? categoryTags(d) : <M.TagList.Item text="Unknown" color={Color.SecondaryText} />}
          </M.TagList>
          <CopyValue title="Vendor : Product ID" text={vidpid(d)} />
          {linkDowngraded(d) && (
            <M.TagList title="Warning">
              <M.TagList.Item
                text={`USB ${bcdToString(d.bcdUSB)} device running at ${speed?.rate} — check cable / hub`}
                icon={Icon.Warning}
                color={Color.Orange}
                onAction={copy(`USB ${bcdToString(d.bcdUSB)} device running at ${speed?.rate}`)}
              />
            </M.TagList>
          )}
          {(d.isHub ||
            children.length > 0 ||
            d.disks.length > 0 ||
            d.serialPorts.length > 0 ||
            d.networkInterfaces.length > 0 ||
            !!d.networkLink) && <M.Separator />}
          {(d.isHub || children.length > 0) && (
            <M.TagList title={`${d.isHub ? "On This Hub" : "Behind This Device"} (${children.length}) ↗`}>
              {children.length ? (
                children.map((c) => {
                  const kids = childrenOf(c, all, pairing).length;
                  return (
                    <M.TagList.Item
                      key={c.key}
                      text={`${label(c)}${c.isHub ? ` · ${kids}` : ""}`}
                      icon={CATEGORY_STYLE[iconOf(c) ?? "Vendor"].icon}
                      color={CATEGORY_STYLE[iconOf(c) ?? "Vendor"].color}
                      onAction={onSelect ? () => onSelect(c.key) : undefined}
                    />
                  );
                })
              ) : (
                <M.TagList.Item text="Nothing plugged in" color={Color.SecondaryText} />
              )}
            </M.TagList>
          )}
          {twin && (
            <M.TagList title="Combined Hub">
              <M.TagList.Item
                text={`USB 3 side: ${label(d)}`}
                color={speedFrom(d.speedCode, d.linkBps)?.color}
                onAction={copy(d.name)}
              />
              <M.TagList.Item
                text={`USB 2 side: ${label(twin)}`}
                color={speedFrom(twin.speedCode, twin.linkBps)?.color}
                onAction={copy(twin.name)}
              />
            </M.TagList>
          )}
          {d.disks.flatMap((k) =>
            k.volumes.map((v) => (
              <CopyValue
                key={v.bsd}
                title={`Volume · ${v.name ?? v.bsd}`}
                text={`${v.mountPoint ?? "not mounted"}${v.size ? `  ·  ${bytes(v.size)}` : ""}`}
                value={v.mountPoint ?? v.bsd}
              />
            )),
          )}
          {d.disks.map((k) => (
            <CopyValue
              key={k.bsd}
              title={`Disk ${k.bsd}`}
              icon={Icon.HardDrive}
              text={[k.name, bytes(k.size), k.ejectable ? "ejectable" : undefined].filter(Boolean).join(" · ")}
              value={k.bsd}
            />
          ))}
          {d.serialPorts.map((p) => (
            <CopyValue key={p} title="Serial Port" text={p} />
          ))}
          {d.networkInterfaces.map((n) => (
            <CopyValue key={n} title="Network Interface" text={n} />
          ))}
          {d.networkLink && (
            <M.TagList title="Ethernet Link">
              {d.networkLink.active ? (
                <M.TagList.Item
                  text={`Cable connected${d.networkLink.speedBps ? ` · ${bps(d.networkLink.speedBps)}` : ""}`}
                  color={Color.Green}
                  icon={Icon.Link}
                  onAction={copy(d.networkLink.speedBps ? bps(d.networkLink.speedBps) : "Cable connected")}
                />
              ) : (
                <M.TagList.Item
                  text="No cable"
                  color={Color.SecondaryText}
                  icon={Icon.Minus}
                  onAction={copy("No cable")}
                />
              )}
            </M.TagList>
          )}
          <M.Separator />
          <M.TagList title="Path ↗">
            {/* Pills can't have separators between them, so each hop carries its own "›". */}
            <M.TagList.Item text="Mac ›" icon={Icon.Desktop} color={Color.SecondaryText} />
            {ancestors.map((a) => (
              <M.TagList.Item
                key={a.key}
                text={`${label(a)} ›`}
                icon={Icon.Box}
                color={Color.SecondaryText}
                onAction={onSelect ? () => onSelect(a.key) : undefined}
              />
            ))}
            {/* Route gray, the device itself in its type colour (no type is gray). */}
            <M.TagList.Item
              text={label(d)}
              icon={CATEGORY_STYLE[iconOf(d) ?? "Vendor"].icon}
              color={CATEGORY_STYLE[iconOf(d) ?? "Vendor"].color}
              onAction={copy(label(d))}
            />
          </M.TagList>
          {linkTags(d).length > 0 && <M.TagList title="Link">{linkTags(d)}</M.TagList>}
          <M.TagList title="Attachment">
            <M.TagList.Item
              text={d.builtIn ? "Built-in" : "External"}
              color={d.builtIn ? Color.SecondaryText : Color.Green}
              icon={d.builtIn ? Icon.Desktop : Icon.Plug}
              onAction={copy(d.builtIn ? "Built-in" : "External")}
            />
            {d.connector && (
              <M.TagList.Item text={d.connector} color={Color.SecondaryText} onAction={copy(d.connector)} />
            )}
            {d.depth > 0 && (
              <M.TagList.Item
                text={`Behind ${d.depth} hub${d.depth > 1 ? "s" : ""}`}
                color={Color.Yellow}
                onAction={copy(`Behind ${d.depth} hub${d.depth > 1 ? "s" : ""}`)}
              />
            )}
            {d.selfPowered !== undefined && (
              <M.TagList.Item
                text={d.selfPowered ? "Self-powered" : "Bus-powered"}
                color={Color.SecondaryText}
                onAction={copy(d.selfPowered ? "Self-powered" : "Bus-powered")}
              />
            )}
          </M.TagList>
          {(d.powerAllocatedmA !== undefined || d.powerAvailablemA !== undefined) && (
            <CopyValue
              title="Power"
              icon={Icon.Bolt}
              text={[
                d.powerAllocatedmA !== undefined ? `${d.powerAllocatedmA} mA allocated` : undefined,
                d.powerAvailablemA !== undefined ? `${d.powerAvailablemA} mA available` : undefined,
              ]
                .filter(Boolean)
                .join(" · ")}
            />
          )}
          {(!!d.serial || d.bcdDevice !== undefined || d.name !== label(d)) && <M.Separator />}
          {d.serial && <CopyValue title="Serial Number" text={d.serial} />}
          {d.bcdDevice !== undefined && (
            <CopyValue title="Device Version" text={bcdToString(d.bcdDevice, false) ?? ""} />
          )}
          {d.name !== label(d) && <CopyValue title="Reported Name" text={d.name} />}
          {(d.interfaces.length > 0 || d.drivers.length > 0 || d.deviceClass !== undefined) && <M.Separator />}
          {d.interfaces.length > 0 && (
            <M.TagList title={`Interfaces (${d.interfaces.length})`}>
              {d.interfaces.map((i, idx) => (
                <M.TagList.Item
                  key={idx}
                  text={`#${i.number ?? idx} ${interfaceLabel(i.classCode, i.subClass, i.protocol)}`}
                  onAction={copy(interfaceLabel(i.classCode, i.subClass, i.protocol))}
                  color={(() => {
                    const c = categoryForInterface(i.classCode, i.subClass, i.protocol);
                    return c
                      ? paleOf(CATEGORY_STYLE[c].color)
                      : paleFor(interfaceLabel(i.classCode, i.subClass, i.protocol));
                  })()}
                />
              ))}
            </M.TagList>
          )}
          {d.drivers.length > 0 && (
            <M.TagList title="Drivers">
              {d.drivers.map((x) => (
                <M.TagList.Item key={x} text={x} color={paleFor(x)} onAction={copy(x)} />
              ))}
            </M.TagList>
          )}
          {d.deviceClass !== undefined && (
            <CopyValue
              title="Device Class"
              text={`${CLASS_NAMES[d.deviceClass] ?? "Unknown"}  (${hex2(d.deviceClass)}/${hex2(d.deviceSubClass)}/${hex2(d.deviceProtocol)})`}
            />
          )}
          <M.Separator />
          {d.locationId !== undefined && (
            <CopyValue title="Location ID" text={`0x${d.locationId.toString(16).padStart(8, "0")}`} />
          )}
          {d.portName && <CopyValue title="Port" text={d.portName} />}
          {d.address !== undefined && <CopyValue title="Bus Address" text={String(d.address)} />}
          <CopyValue title="Controller" text={d.controller} />
        </M>
      }
    />
  );
}

export function RawProperties({ d }: { d: UsbDevice }) {
  const body = json(d, true);
  return (
    <Detail
      navigationTitle={`${d.name} — raw`}
      markdown={"```json\n" + body + "\n```"}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy JSON" content={body} />
        </ActionPanel>
      }
    />
  );
}
