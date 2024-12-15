import { ActionPanel, Icon, showToast, Action, Image, Keyboard, Toast } from "@raycast/api";
import { formatDistanceToNow } from "date-fns";

import { useUsers } from "../../hooks";
import {
  getPropertyIcon,
  notionColorToTintColor,
  patchPage,
  PageProperty,
  DatabaseProperty,
  PropertyConfig,
  ReadablePropertyType,
} from "../../utils/notion";

type EditPropertyOptions = PropertyConfig<"select" | "multi_select">["options"][number] & {
  icon?: string;
};

export function ActionEditPageProperty({
  databaseProperty,
  pageId,
  pageProperty,
  shortcut,
  mutate,
  icon,
  options,
}: {
  databaseProperty: DatabaseProperty;
  pageId: string;
  pageProperty?: PageProperty;
  mutate: () => Promise<void>;
  shortcut?: Keyboard.Shortcut;
  icon?: Image.ImageLike;
  options?: EditPropertyOptions[];
}) {
  if (!icon) icon = getPropertyIcon(databaseProperty);

  const { data: users } = useUsers();

  const title = "Set " + databaseProperty.name;

  async function setPageProperty(patch: Parameters<typeof patchPage>[1]) {
    showToast({
      style: Toast.Style.Animated,
      title: "Updating Property",
    });
    const updatedPage = await patchPage(pageId, patch);
    if (updatedPage && updatedPage.id) {
      showToast({
        title: "Property Updated",
      });
      mutate();
    }
  }

  const { type, config, value } = propertyHelper(databaseProperty, pageProperty);

  switch (type) {
    case "checkbox":
      return (
        <Action
          title={(value ? "Uncheck " : "Check ") + databaseProperty.name}
          icon={value ? Icon.Checkmark : Icon.Circle}
          shortcut={shortcut}
          onAction={() => setPageProperty({ [databaseProperty.id]: { checkbox: !value } })}
        />
      );

    case "select": {
      if (!options) options = config.options;
      return (
        <ActionPanel.Submenu title={title} icon={icon} shortcut={shortcut}>
          {options?.map((opt) => (
            <Action
              key={opt.id}
              icon={
                (opt.icon ? opt.icon : opt.id !== "_select_null_")
                  ? {
                      source: opt.icon ? opt.icon : value?.id === opt.id ? Icon.Checkmark : Icon.Circle,
                      tintColor: notionColorToTintColor(opt.color),
                    }
                  : undefined
              }
              title={(opt.name ? opt.name : "Untitled") + (opt.icon && value?.id === opt.id ? "  ✓" : "")}
              onAction={() => {
                if (opt.id && opt.id !== "_select_null_") {
                  setPageProperty({ [databaseProperty.id]: { select: { id: opt.id } } });
                } else {
                  setPageProperty({ [databaseProperty.id]: { select: null } });
                }
              }}
            />
          ))}
        </ActionPanel.Submenu>
      );
    }

    case "status": {
      if (!options) options = config.options;
      return (
        <ActionPanel.Submenu title={title} icon={icon} shortcut={shortcut}>
          {options?.map((opt) => (
            <Action
              key={opt.id}
              icon={
                (opt.icon ? opt.icon : opt.id !== "_select_null_")
                  ? {
                      source: opt.icon ? opt.icon : value?.id === opt.id ? Icon.Checkmark : Icon.Circle,
                      tintColor: notionColorToTintColor(opt.color),
                    }
                  : undefined
              }
              title={(opt.name ? opt.name : "Untitled") + (opt.icon && value?.id === opt.id ? "  ✓" : "")}
              onAction={() => {
                if (opt.id && opt.id !== "_select_null_") {
                  setPageProperty({ [databaseProperty.id]: { status: { id: opt.id } } });
                } else {
                  setPageProperty({ [databaseProperty.id]: { status: null } });
                }
              }}
            />
          ))}
        </ActionPanel.Submenu>
      );
    }

    case "date": {
      return (
        <ActionPanel.Submenu title={title} icon={icon} shortcut={shortcut}>
          <ActionPanel.Submenu
            title={value?.start ? formatDistanceToNow(new Date(value.start)) : "No Date"}
            icon="icon/date_start.png"
          >
            <Action
              title="Now"
              onAction={() => {
                const date = value ? value : { start: new Date(Date.now()).toISOString() };
                date.start = new Date(Date.now()).toISOString();
                setPageProperty({ [databaseProperty.id]: { date } });
              }}
            />
          </ActionPanel.Submenu>
          <ActionPanel.Submenu
            title={value?.end ? formatDistanceToNow(new Date(value.end)) : "No Date"}
            icon="icon/date_end.png"
          >
            <Action
              title="Now"
              onAction={() => {
                const date = value
                  ? value
                  : { start: new Date(Date.now()).toISOString(), end: new Date(Date.now()).toISOString() };
                date.end = new Date(Date.now()).toISOString();
                setPageProperty({ [databaseProperty.id]: { date } });
              }}
            />
          </ActionPanel.Submenu>
        </ActionPanel.Submenu>
      );
    }

    case "multi_select": {
      if (!options) options = config.options;
      const multiSelectIds = value?.map((selection) => selection.id);
      return (
        <ActionPanel.Submenu title={title} icon={icon} shortcut={shortcut}>
          {options?.map((opt) => {
            if (!opt.id) {
              return null;
            }
            return (
              <Action
                key={opt.id}
                icon={{
                  source: opt.id && multiSelectIds?.includes(opt.id) ? Icon.Checkmark : Icon.Circle,
                  tintColor: notionColorToTintColor(opt.color),
                }}
                title={opt.name}
                onAction={() => {
                  if (!value || !opt.id) {
                    return null;
                  }
                  if (opt.id && multiSelectIds?.includes(opt.id)) {
                    setPageProperty({
                      [databaseProperty.id]: {
                        multi_select: value.filter((o) => o.id !== opt.id),
                      },
                    });
                  } else {
                    setPageProperty({
                      [databaseProperty.id]: {
                        multi_select: [...value, { id: opt.id }],
                      },
                    });
                  }
                }}
              />
            );
          })}
        </ActionPanel.Submenu>
      );
    }

    case "people": {
      const peopleIds = value?.map((user) => user.id);
      return (
        <ActionPanel.Submenu title={title} icon={icon} shortcut={shortcut}>
          <ActionPanel.Section>
            {value?.map((user) => (
              <Action
                key={user.id}
                icon={
                  "avatar_url" in user && user.avatar_url
                    ? { source: user.avatar_url, mask: Image.Mask.Circle }
                    : undefined
                }
                title={("name" in user ? user.name : "Unknown") + "  ✓"}
                onAction={() =>
                  setPageProperty({
                    [databaseProperty.id]: {
                      people: value.filter((o) => o.id !== user.id),
                    },
                  })
                }
              />
            ))}
          </ActionPanel.Section>
          <ActionPanel.Section>
            {users
              .filter((user) => !peopleIds?.includes(user.id))
              .map((user) => (
                <Action
                  key={user.id}
                  icon={user?.avatar_url ? { source: user.avatar_url, mask: Image.Mask.Circle } : undefined}
                  title={user?.name ? user.name : "Unknown"}
                  onAction={() =>
                    setPageProperty({
                      [databaseProperty.id]: {
                        people: [...(value || []), { id: user.id }],
                      },
                    })
                  }
                />
              ))}
          </ActionPanel.Section>
        </ActionPanel.Submenu>
      );
    }

    default:
      return null;
  }
}

// This isn't great code, but this component will be replaced soon.
const propertyHelper = (databaseProperty: DatabaseProperty, pageProperty?: PageProperty) =>
  ({
    type: databaseProperty.type,
    config: databaseProperty.config,
    value: pageProperty?.value,
  }) as {
    [PP in Extract<PageProperty, { type: ReadablePropertyType }> as PP["type"]]: {
      type: PP["type"];
      config: PropertyConfig<PP["type"]>;
      value?: PP["value"];
    };
  }[ReadablePropertyType];
