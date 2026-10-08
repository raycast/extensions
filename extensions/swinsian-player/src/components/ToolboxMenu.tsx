import { Icon, MenuBarExtra, showHUD } from "@raycast/api";
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

interface ToolboxMenuProps {
  track: {
    artist: string;
    albumArtist: string;
    album: string;
    name: string;
    genre: string;
    year: number;
    path: string;
  };
  hiddenCategories: string;
  hiddenServices: string;
  customServices: string;
  lastfmUsername: string;
}

const contextFor = (props: ToolboxMenuProps, type: ToolboxContextType): ToolboxContext => ({
  type,
  artist: props.track.artist,
  albumArtist: props.track.albumArtist,
  album: props.track.album,
  track: props.track.name,
  genre: props.track.genre,
  year: props.track.year,
  path: props.track.path,
});

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));
const commaSet = (value = "") =>
  new Set(
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );

function useToolboxConfiguration(props: ToolboxMenuProps) {
  const hiddenCategories = commaSet(props.hiddenCategories);
  const hiddenServices = commaSet(props.hiddenServices);
  let customServices: ToolboxService[] = [];
  let customError = "";
  try {
    customServices = parseCustomServices(props.customServices);
  } catch (error) {
    customError = errorMessage(error);
  }
  return {
    hiddenCategories,
    customError,
    services: [...TOOLBOX_SERVICES, ...customServices].filter((service) => !hiddenServices.has(service.id)),
  };
}

function ServiceItem({
  service,
  context,
  username,
}: {
  service: ToolboxService;
  context: ToolboxContext;
  username: string;
}) {
  return (
    <MenuBarExtra.Item
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
  );
}

function ServiceSection({
  category,
  services,
  type,
  context,
  username,
}: {
  category: ToolboxCategory;
  services: ToolboxService[];
  type: ToolboxContextType;
  context: ToolboxContext;
  username: string;
}) {
  if (!services.length) return null;
  return (
    <MenuBarExtra.Section title={TOOLBOX_CATEGORY_LABELS[category]}>
      {services.map((service) => (
        <ServiceItem
          key={`${type}-${category}-${service.id}`}
          service={service}
          context={context}
          username={username}
        />
      ))}
    </MenuBarExtra.Section>
  );
}

const supported = (services: ToolboxService[], category: ToolboxCategory, type: ToolboxContextType) =>
  services.filter(
    (service) =>
      service.id !== "audiodb" &&
      service.category === category &&
      (!service.supports || service.supports.includes(type)),
  );

function ContextServices({
  type,
  title,
  icon,
  categories,
  services,
  context,
  username,
}: {
  type: ToolboxContextType;
  title: string;
  icon: Icon;
  categories: ToolboxCategory[];
  services: ToolboxService[];
  context: ToolboxContext;
  username: string;
}) {
  return (
    <MenuBarExtra.Submenu title={title} icon={icon}>
      {categories.map((category) => (
        <ServiceSection
          key={`${type}-${category}`}
          category={category}
          services={supported(services, category, type)}
          type={type}
          context={context}
          username={username}
        />
      ))}
    </MenuBarExtra.Submenu>
  );
}

export function ToolboxDiscovery(props: ToolboxMenuProps) {
  const { hiddenCategories, customError, services } = useToolboxConfiguration(props);
  const visible = (categories: ToolboxCategory[]) => categories.filter((category) => !hiddenCategories.has(category));
  return (
    <MenuBarExtra.Submenu title="Discovery" icon={Icon.MagnifyingGlass}>
      <ContextServices
        type="artist"
        title="Artist"
        icon={Icon.Person}
        categories={visible(["databases", "streaming"])}
        services={services}
        context={contextFor(props, "artist")}
        username={props.lastfmUsername}
      />
      <ContextServices
        type="album"
        title="Album"
        icon={Icon.Cd}
        categories={visible(["databases", "streaming"])}
        services={services}
        context={contextFor(props, "album")}
        username={props.lastfmUsername}
      />
      <ContextServices
        type="track"
        title="Track"
        icon={Icon.Music}
        categories={visible(["databases", "streaming"])}
        services={services}
        context={contextFor(props, "track")}
        username={props.lastfmUsername}
      />
      {!hiddenCategories.has("lyrics") && (
        <ContextServices
          type="track"
          title="Lyrics"
          icon={Icon.TextDocument}
          categories={["lyrics"]}
          services={services}
          context={contextFor(props, "track")}
          username={props.lastfmUsername}
        />
      )}
      {!hiddenCategories.has("covers") && (
        <ContextServices
          type="album"
          title="Covers"
          icon={Icon.Image}
          categories={["covers"]}
          services={services}
          context={contextFor(props, "album")}
          username={props.lastfmUsername}
        />
      )}
      {!hiddenCategories.has("social") && (
        <ContextServices
          type="artist"
          title="Social"
          icon={Icon.Person}
          categories={["social"]}
          services={services}
          context={contextFor(props, "artist")}
          username={props.lastfmUsername}
        />
      )}
      {!hiddenCategories.has("utilities") && (
        <ContextServices
          type="track"
          title="Utilities"
          icon={Icon.Hammer}
          categories={["utilities"]}
          services={services}
          context={contextFor(props, "track")}
          username={props.lastfmUsername}
        />
      )}
      {customError && (
        <MenuBarExtra.Item title="Custom Services JSON Is Invalid" subtitle={customError} icon={Icon.Warning} />
      )}
    </MenuBarExtra.Submenu>
  );
}

export function ToolboxLastfm(props: ToolboxMenuProps) {
  const { hiddenCategories, services } = useToolboxConfiguration(props);
  if (hiddenCategories.has("lastfm")) return null;
  return (
    <ContextServices
      type="artist"
      title="Last.fm"
      icon={Icon.Heart}
      categories={["lastfm"]}
      services={services}
      context={contextFor(props, "artist")}
      username={props.lastfmUsername}
    />
  );
}
