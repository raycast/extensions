import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  launchCommand,
  LaunchType,
  List,
  openExtensionPreferences,
} from "@raycast/api";
import { ConnectionEmptyView } from "./components/connection-state";
import { useConnectedBoox } from "./hooks/use-connected-boox";
import { useQuery } from "./hooks/use-query";
import { formatBytes } from "./lib/format";
import { BookListItem, LibraryView } from "./views/library-view";
import { NotesView } from "./views/notes-view";
import { StorageView } from "./views/storage-view";
import { MediaView } from "./views/media-view";
import { DevicesView } from "./views/devices-view";

export default function BooxCommand() {
  const connection = useConnectedBoox();
  const client = connection.data?.client;
  const library = useQuery(
    `overview-library:${client?.host ?? "none"}`,
    () => client!.getLibrary({ limit: 50 }),
    Boolean(client)
  );
  const media = useQuery(
    `overview-media:${client?.host ?? "none"}`,
    () => client!.getMediaCategories(),
    Boolean(client)
  );

  if (!connection.data) {
    return (
      <List isLoading={connection.isLoading}>
        <ConnectionEmptyView
          error={connection.error}
          isLoading={connection.isLoading}
          onRetry={connection.revalidate}
        />
      </List>
    );
  }

  const connected = connection.data;
  const { device } = connected;
  const availableStorage =
    device.storageTotal !== undefined && device.storageUsed !== undefined
      ? Math.max(0, device.storageTotal - device.storageUsed)
      : undefined;
  const continueReading = (library.data?.books ?? [])
    .filter((book) => book.progressPercent > 0 && book.progressPercent < 100)
    .sort((left, right) => (right.lastAccess?.getTime() ?? 0) - (left.lastAccess?.getTime() ?? 0))
    .slice(0, 5);

  return (
    <List isLoading={library.isLoading || media.isLoading} searchBarPlaceholder="Search BOOX actions and recent books">
      <List.Section title="Device">
        <List.Item
          icon={device.screenAvailable ? Icon.Devices : Icon.Mobile}
          title={device.nickname || device.model}
          subtitle={device.screenAvailable ? "BOOXDrop and Screen Mirroring available" : "BOOXDrop available"}
          accessories={availableStorage !== undefined ? [{ text: `${formatBytes(availableStorage)} available` }] : []}
          actions={<DeviceActionPanel device={device} onRefresh={connection.revalidate} />}
        />
      </List.Section>

      {continueReading.length ? (
        <List.Section title="Continue Reading">
          {continueReading.map((book) => (
            <BookListItem key={book.id} client={connected.client} book={book} />
          ))}
        </List.Section>
      ) : null}

      <List.Section title="Browse">
        <List.Item
          icon={Icon.Book}
          title="Library"
          subtitle={`${library.data?.bookCount ?? 0} books · ${library.data?.shelfCount ?? 0} shelves`}
          actions={
            <ActionPanel>
              <Action.Push title="Open Library" icon={Icon.Book} target={<LibraryView client={connected.client} />} />
              <Action
                title="Add to BOOX Library"
                icon={Icon.Upload}
                onAction={() =>
                  launchCommand({ name: "send-to-boox", type: LaunchType.UserInitiated, context: { mode: "library" } })
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Pencil}
          title="Notes"
          subtitle="Browse and export handwritten notes"
          actions={
            <ActionPanel>
              <Action.Push title="Open Notes" icon={Icon.Pencil} target={<NotesView client={connected.client} />} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.HardDrive}
          title="Internal Storage"
          subtitle="Browse files and folders"
          actions={
            <ActionPanel>
              <Action.Push
                title="Open Storage"
                icon={Icon.HardDrive}
                target={<StorageView client={connected.client} />}
              />
              <Action
                title="Send to BOOX"
                icon={Icon.Upload}
                onAction={() => launchCommand({ name: "send-to-boox", type: LaunchType.UserInitiated })}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {media.data?.length ? (
        <List.Section title="Media">
          {media.data.map((category) => (
            <List.Item
              key={category.type}
              icon={mediaIcon(category.type)}
              title={category.name}
              accessories={[{ text: String(category.count) }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title={`Open ${category.name}`}
                    target={<MediaView client={connected.client} type={category.type} title={category.name} />}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

function DeviceActionPanel(props: { device: import("./models/boox").BooxDevice; onRefresh: () => void }) {
  return (
    <ActionPanel>
      <Action.Push title="Show Device Details" icon={Icon.Sidebar} target={<DeviceDetail device={props.device} />} />
      <Action
        title="Send to BOOX"
        icon={Icon.Upload}
        onAction={() => launchCommand({ name: "send-to-boox", type: LaunchType.UserInitiated })}
      />
      <Action
        title="Open BOOX Screen"
        icon={Icon.Monitor}
        onAction={() => launchCommand({ name: "open-boox-screen", type: LaunchType.UserInitiated })}
      />
      <Action
        title="Capture BOOX Screen"
        icon={Icon.Camera}
        onAction={() => launchCommand({ name: "capture-boox-screen", type: LaunchType.UserInitiated })}
      />
      <Action
        title="Capture BOOX Region"
        icon={Icon.Crop}
        onAction={() => launchCommand({ name: "capture-boox-region", type: LaunchType.UserInitiated })}
      />
      <Action title="Refresh Device" icon={Icon.ArrowClockwise} onAction={props.onRefresh} />
      <Action.Push
        title="Find Other BOOX Devices"
        icon={Icon.Binoculars}
        target={<DevicesView onSelected={props.onRefresh} />}
      />
      <Action.CopyToClipboard title="Copy Device Address" content={props.device.host} />
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </ActionPanel>
  );
}

function DeviceDetail(props: { device: import("./models/boox").BooxDevice }) {
  const { device } = props;
  return (
    <Detail
      markdown={`# ${device.nickname || device.model}\n\n${device.screenAvailable ? "BOOXDrop and Screen Mirroring are available." : "BOOXDrop is available. Start Screen Mirroring on the device to use screen commands."}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Model" text={device.model} />
          {device.nickname ? <Detail.Metadata.Label title="Nickname" text={device.nickname} /> : null}
          <Detail.Metadata.Label title="BOOXDrop" text={device.host} />
          <Detail.Metadata.Label title="Screen" text={device.screenAvailable ? device.screenHost : "Not active"} />
          <Detail.Metadata.Label title="Storage Used" text={formatBytes(device.storageUsed)} />
          <Detail.Metadata.Label title="Storage Total" text={formatBytes(device.storageTotal)} />
        </Detail.Metadata>
      }
    />
  );
}

function mediaIcon(type: string): Icon {
  switch (type.toLowerCase()) {
    case "image":
      return Icon.Image;
    case "video":
      return Icon.FilmStrip;
    case "music":
      return Icon.Music;
    case "download":
      return Icon.Download;
    default:
      return Icon.Document;
  }
}
