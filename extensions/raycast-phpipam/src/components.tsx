import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  List,
  Toast,
  open,
  openExtensionPreferences,
  showHUD,
  showToast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";

import { ApiError, apiSettingsUrl, phpipam, webBaseUrl } from "./api";
import type { IpAddress, Subnet } from "./types";
import {
  fmtNum,
  fmtPct,
  ipOf,
  isFolder,
  s,
  sortAddresses,
  subnetLabel,
  tagColor,
  tagName,
} from "./utils";

export function subnetWebUrl(subnet: Subnet): string {
  return `${webBaseUrl()}/index.php?page=subnets&section=${s(subnet.sectionId)}&subnetId=${s(subnet.id)}`;
}

function addressWebUrl(
  sectionId: string,
  subnetId: string,
  addressId: string,
): string {
  return `${webBaseUrl()}/index.php?page=subnets&section=${sectionId}&subnetId=${subnetId}&sPage=address-details&ipaddrid=${addressId}`;
}

/** Opening an address requires its section, which search results don't carry. */
async function openAddressInBrowser(address: IpAddress, sectionId?: string) {
  try {
    let section = sectionId;
    if (!section) {
      const subnet = await phpipam.subnet(s(address.subnetId));
      section = s(subnet.sectionId);
    }
    await open(addressWebUrl(section, s(address.subnetId), s(address.id)));
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open address",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function copyFirstFreeAddress(subnet: Subnet) {
  const label = subnetLabel(subnet);
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Searching first free address in ${label}…`,
  });
  try {
    const ip = await phpipam.firstFreeAddress(s(subnet.id));
    if (!ip) {
      toast.style = Toast.Style.Failure;
      toast.title = "No free address";
      toast.message = `${label} is full`;
      return;
    }
    await Clipboard.copy(ip);
    await toast.hide();
    await showHUD(`Copied ${ip}`);
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Search failed";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

export function AddressListItem({
  address,
  sectionId,
}: {
  address: IpAddress;
  sectionId?: string;
}) {
  const ip = ipOf(address);
  const state = s(address.state);
  const hostname = s(address.hostname);
  const tag = tagName(state);

  const accessories: List.Item.Accessory[] = [];
  if (tag) accessories.push({ tag: { value: tag, color: tagColor(state) } });
  if (s(address.mac)) accessories.push({ text: s(address.mac) });
  if (s(address.owner)) accessories.push({ text: s(address.owner) });

  return (
    <List.Item
      id={s(address.id)}
      icon={{ source: Icon.Circle, tintColor: tagColor(state) }}
      title={ip}
      subtitle={hostname || s(address.description)}
      accessories={accessories}
      keywords={[
        hostname,
        s(address.description),
        s(address.owner),
        s(address.mac),
        ip,
      ]}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy IP Address" content={ip} />
          <Action.Push
            title="Show Subnet"
            icon={Icon.ChevronRight}
            target={
              <SubnetDetailView
                subnetId={s(address.subnetId)}
                sectionId={sectionId}
              />
            }
          />
          <Action
            title="Open in PhpIPAM"
            icon={Icon.Globe}
            onAction={() => openAddressInBrowser(address, sectionId)}
          />
          {hostname ? (
            <Action.CopyToClipboard
              title="Copy Hostname"
              content={hostname}
              shortcut={{ modifiers: ["cmd"], key: "h" }}
            />
          ) : null}
          <Action.CopyToClipboard
            title="Copy MAC Address"
            content={s(address.mac)}
            shortcut={{ modifiers: ["cmd"], key: "m" }}
          />
        </ActionPanel>
      }
    />
  );
}

export function SubnetListItem({
  subnet,
  sectionId,
}: {
  subnet: Subnet;
  sectionId?: string;
}) {
  const label = subnetLabel(subnet);
  const folder = isFolder(subnet);

  const accessories: List.Item.Accessory[] = [];
  if (!folder && s(subnet.vlanId))
    accessories.push({ text: `VLAN ${s(subnet.vlanId)}` });
  if (!folder && subnet.usage) {
    const usedPct = fmtPct(subnet.usage.Used_percent);
    if (usedPct) accessories.push({ text: `${usedPct} used` });
  }
  if (!folder && s(subnet.isFull) === "1")
    accessories.push({ tag: { value: "full", color: Color.Orange } });

  return (
    <List.Item
      id={s(subnet.id)}
      icon={folder ? Icon.Folder : Icon.Globe}
      title={label}
      subtitle={s(subnet.description)}
      accessories={accessories}
      keywords={[
        s(subnet.description),
        ...label.split("/"),
        `vlan ${s(subnet.vlanId)}`,
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            title="Open Subnet"
            icon={Icon.ChevronRight}
            target={
              <SubnetDetailView
                subnetId={s(subnet.id)}
                sectionId={sectionId ?? s(subnet.sectionId)}
              />
            }
          />
          {folder ? null : (
            <Action.CopyToClipboard title="Copy CIDR" content={label} />
          )}
          {folder ? null : (
            <Action
              title="Copy First Free Address"
              icon={Icon.PlusCircle}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
              onAction={() => copyFirstFreeAddress(subnet)}
            />
          )}
          <Action.OpenInBrowser
            title="Open in PhpIPAM"
            url={subnetWebUrl(subnet)}
          />
        </ActionPanel>
      }
    />
  );
}

function InfoRow({ title, value }: { title: string; value?: string }) {
  if (!value) return null;
  return (
    <List.Item
      title={title}
      subtitle={value}
      icon={Icon.Tag}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title={`Copy ${title}`} content={value} />
        </ActionPanel>
      }
    />
  );
}

/** Result of a supplementary request: its value, or the error it failed with. */
type Supplementary<T> = { value?: T; error?: unknown };

function settle<T>(request: Promise<T>): Promise<Supplementary<T>> {
  return request.then(
    (value) => ({ value }),
    (error: unknown) => ({ error }),
  );
}

export function SubnetDetailView({
  subnetId,
  sectionId,
}: {
  subnetId: string;
  sectionId?: string;
}) {
  const { isLoading, data, error, revalidate } = usePromise(
    async (id: string) => {
      const subnet = await phpipam.subnet(id);
      // Usage and addresses are supplementary: keep the subnet visible when
      // they fail, but report the failure instead of pretending it is empty.
      const usage = await settle(phpipam.subnetUsage(id));
      const addresses = await settle(phpipam.subnetAddresses(id));
      return { subnet, usage, addresses };
    },
    [subnetId],
    silentPromiseOptions,
  );

  if (error) {
    return <ErrorView error={error} onRetry={revalidate} />;
  }

  const subnet = data?.subnet;
  const notFolder = subnet ? !isFolder(subnet) : false;
  const usage = notFolder ? data?.usage.value : undefined;
  const usageError = notFolder ? data?.usage.error : undefined;
  const addressList = sortAddresses(data?.addresses.value ?? []);
  const addressesError = data?.addresses.error;
  const resolvedSectionId = sectionId ?? s(subnet?.sectionId);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={subnet ? subnetLabel(subnet) : "Subnet"}
      searchBarPlaceholder="Filter addresses…"
    >
      {usageError ? (
        <List.Section title="Usage">
          <LoadErrorRow what="Usage" error={usageError} onRetry={revalidate} />
        </List.Section>
      ) : usage ? (
        <List.Section title="Usage">
          <InfoRow title="Hosts" value={fmtNum(usage.max_hosts)} />
          <InfoRow
            title="Used"
            value={`${fmtNum(usage.Used)} (${fmtPct(usage.Used_percent)})`}
          />
          <InfoRow
            title="Reserved"
            value={`${fmtNum(usage.Reserved)} (${fmtPct(usage.Reserved_percent)})`}
          />
          <InfoRow
            title="Free"
            value={`${fmtNum(usage.freehosts)} (${fmtPct(usage.freehosts_percent)})`}
          />
        </List.Section>
      ) : null}
      {subnet ? (
        <List.Section title="Details">
          <InfoRow title="Description" value={s(subnet.description)} />
          {isFolder(subnet) ? null : (
            <InfoRow title="Mask" value={`/${s(subnet.mask)}`} />
          )}
          {s(subnet.vlanId) ? (
            <InfoRow title="VLAN" value={s(subnet.vlanId)} />
          ) : null}
          {s(subnet.isFull) === "1" ? (
            <InfoRow title="Marked as" value="Full" />
          ) : null}
        </List.Section>
      ) : null}
      <List.Section
        title={
          addressesError ? "Addresses" : `Addresses (${addressList.length})`
        }
      >
        {addressesError ? (
          <LoadErrorRow
            what="Addresses"
            error={addressesError}
            onRetry={revalidate}
          />
        ) : (
          addressList.map((address) => (
            <AddressListItem
              key={s(address.id)}
              address={address}
              sectionId={resolvedSectionId}
            />
          ))
        )}
      </List.Section>
    </List>
  );
}

/** A failed supplementary load (usage/addresses) inside an otherwise working detail view. */
function LoadErrorRow({
  what,
  error,
  onRetry,
}: {
  what: string;
  error: unknown;
  onRetry: () => void;
}) {
  return (
    <List.Item
      icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
      title={`${what} unavailable`}
      subtitle={errorMessage(error)}
      actions={
        <ActionPanel>
          <Action title="Retry" icon={Icon.ArrowClockwise} onAction={onRetry} />
        </ActionPanel>
      }
    />
  );
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (/invalid application id/i.test(error.message)) {
      return `${error.message} — the "API App ID" preference must exactly match an App ID created in phpIPAM under Administration → API.`;
    }
    if (/^unauthorized$/i.test(error.message.trim())) {
      return `${error.message} — token rejected. If the API app uses "SSL with App code" security, put the app code in the "API App Code" preference (username/password are ignored). Otherwise check username and password: the API requires a local phpIPAM user (not SAML).`;
    }
    if (/invalid username or password/i.test(error.message)) {
      return `${error.message} — check the "Username" and "Password" preferences; the API needs a local phpIPAM user with API access.`;
    }
    if (error.code === 401 || error.code === 403) {
      return `${error.message} — check your credentials and the API app permissions in phpIPAM.`;
    }
  }
  return error instanceof Error ? error.message : String(error);
}

/**
 * Commands render their own error view, so silence usePromise's default
 * raw-stack failure toast.
 */
export const silentPromiseOptions = { onError: () => undefined };

export function ErrorView({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  return (
    <List navigationTitle="phpIPAM">
      <List.Item
        icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
        title="Request failed"
        subtitle={errorMessage(error)}
        actions={
          <ActionPanel>
            {onRetry ? (
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={onRetry}
              />
            ) : null}
            <Action.OpenInBrowser
              title="Open PhpIPAM API Settings"
              url={apiSettingsUrl()}
            />
            <Action
              title="Open Extension Preferences"
              icon={Icon.Gear}
              onAction={() => openExtensionPreferences()}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
