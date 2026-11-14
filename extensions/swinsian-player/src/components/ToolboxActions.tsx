import { Action, ActionPanel, Icon, showHUD } from "@raycast/api";
import {
  openToolboxServiceForContext,
  parseCustomServices,
  TOOLBOX_CATEGORY_LABELS,
  TOOLBOX_SERVICES,
  type ToolboxCategory,
  type ToolboxContext,
  type ToolboxContextType,
  type ToolboxService,
} from "../toolbox";

interface PopupTrack {
  artist: string;
  albumArtist: string;
  album: string;
  name: string;
  genre: string;
  year: number;
  path: string;
}

interface ToolboxActionsProps {
  track: PopupTrack;
  contextTypes?: ToolboxContextType[];
  hiddenCategories?: string;
  hiddenServices?: string;
  customServices?: string;
  lastfmUsername?: string;
}

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));
const commaSet = (value = "") =>
  new Set(
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );

const contextFor = (track: PopupTrack, type: ToolboxContextType): ToolboxContext => ({
  type,
  artist: track.artist,
  albumArtist: track.albumArtist,
  album: track.album,
  track: track.name,
  genre: track.genre,
  year: track.year,
  path: track.path,
});

function ServiceActions({
  title,
  type,
  categories,
  services,
  track,
  username,
}: {
  title: string;
  type: ToolboxContextType;
  categories: ToolboxCategory[];
  services: ToolboxService[];
  track: PopupTrack;
  username: string;
}) {
  const context = contextFor(track, type);
  const supported = services.filter(
    (service) =>
      service.id !== "audiodb" &&
      categories.includes(service.category) &&
      (!service.supports || service.supports.includes(type)),
  );
  if (!supported.length) return null;
  return (
    <ActionPanel.Submenu title={title} icon={type === "artist" ? Icon.Person : type === "album" ? Icon.Cd : Icon.Music}>
      {categories.map((category) => {
        const categoryServices = supported.filter((service) => service.category === category);
        if (!categoryServices.length) return null;
        return (
          <ActionPanel.Section key={`${type}-${category}`} title={TOOLBOX_CATEGORY_LABELS[category]}>
            {categoryServices.map((service) => (
              <Action
                key={`${type}-${category}-${service.id}`}
                title={service.title}
                icon={service.icon ? { source: service.icon } : Icon.Link}
                onAction={async () => {
                  try {
                    await openToolboxServiceForContext(service, context, username);
                  } catch (error) {
                    await showHUD(`Discovery: ${errorMessage(error)}`);
                  }
                }}
              />
            ))}
          </ActionPanel.Section>
        );
      })}
    </ActionPanel.Submenu>
  );
}

export function ToolboxPopupDiscovery(props: ToolboxActionsProps) {
  const hiddenCategories = commaSet(props.hiddenCategories);
  const hiddenServices = commaSet(props.hiddenServices);
  let customServices: ToolboxService[] = [];
  let customError = "";
  try {
    customServices = parseCustomServices(props.customServices || "");
  } catch (error) {
    customError = errorMessage(error);
  }
  const services = [...TOOLBOX_SERVICES, ...customServices].filter((service) => !hiddenServices.has(service.id));
  const visible = (categories: ToolboxCategory[]) => categories.filter((category) => !hiddenCategories.has(category));
  const username = props.lastfmUsername || "";
  const contextTypes = props.contextTypes ?? ["artist", "album", "track"];
  const includes = (type: ToolboxContextType) => contextTypes.includes(type);

  return (
    <ActionPanel.Submenu title="Discovery" icon={Icon.MagnifyingGlass}>
      {includes("artist") && (
        <ServiceActions
          title="Artist"
          type="artist"
          categories={visible(["databases", "streaming"])}
          services={services}
          track={props.track}
          username={username}
        />
      )}
      {includes("album") && (
        <ServiceActions
          title="Album"
          type="album"
          categories={visible(["databases", "streaming"])}
          services={services}
          track={props.track}
          username={username}
        />
      )}
      {includes("track") && (
        <ServiceActions
          title="Track"
          type="track"
          categories={visible(["databases", "streaming"])}
          services={services}
          track={props.track}
          username={username}
        />
      )}
      {includes("track") && !hiddenCategories.has("lyrics") && (
        <ServiceActions
          title="Lyrics"
          type="track"
          categories={["lyrics"]}
          services={services}
          track={props.track}
          username={username}
        />
      )}
      {includes("album") && !hiddenCategories.has("covers") && (
        <ServiceActions
          title="Covers"
          type="album"
          categories={["covers"]}
          services={services}
          track={props.track}
          username={username}
        />
      )}
      {includes("artist") && !hiddenCategories.has("social") && (
        <ServiceActions
          title="Social"
          type="artist"
          categories={["social"]}
          services={services}
          track={props.track}
          username={username}
        />
      )}
      {includes("track") && !hiddenCategories.has("utilities") && (
        <ServiceActions
          title="Utilities"
          type="track"
          categories={["utilities"]}
          services={services}
          track={props.track}
          username={username}
        />
      )}
      {customError && (
        <Action
          title="Custom Services JSON Is Invalid"
          icon={Icon.Warning}
          onAction={() => showHUD(`Custom Services: ${customError}`)}
        />
      )}
    </ActionPanel.Submenu>
  );
}

export function ToolboxPopupLastfm(props: ToolboxActionsProps) {
  if (props.contextTypes && !props.contextTypes.includes("artist")) return null;
  const hiddenCategories = commaSet(props.hiddenCategories);
  if (hiddenCategories.has("lastfm")) return null;
  let customServices: ToolboxService[] = [];
  try {
    customServices = parseCustomServices(props.customServices || "");
  } catch {
    // The menu-bar surface shows the detailed preference error.
  }
  const hiddenServices = commaSet(props.hiddenServices);
  const services = [...TOOLBOX_SERVICES, ...customServices].filter((service) => !hiddenServices.has(service.id));
  return (
    <ServiceActions
      title="Last.fm"
      type="artist"
      categories={["lastfm"]}
      services={services}
      track={props.track}
      username={props.lastfmUsername || ""}
    />
  );
}
