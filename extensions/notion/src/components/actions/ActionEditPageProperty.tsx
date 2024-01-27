import { ActionPanel, Icon, showToast, Action, Image, Keyboard, Toast } from "@raycast/api";
import { formatDistanceToNow } from "date-fns";

import { useUsers } from "../../hooks";
import {
  getPropertyIcon,
  notionColorToTintColor,
  patchPage,
  PagePropertyType,
  DatabaseProperty,
  DatabasePropertyOption,
} from "../../utils/notion";

export function ActionEditPageProperty(props: {
  databaseProperty: DatabaseProperty;
  pageId: string;
  pageProperty?: PagePropertyType;
  mutate: () => Promise<void>;
  shortcut?: Keyboard.Shortcut;
  icon?: Image.ImageLike;
  customOptions?: DatabasePropertyOption[];
}) {
  const {
    databaseProperty,
    pageId,
    pageProperty,
    shortcut,
    mutate,
    icon = getPropertyIcon(databaseProperty),
    customOptions: options = databaseProperty.options || [],
  } = props;

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

  switch (databaseProperty.type) {
    case "checkbox": {
      const value = !!pageProperty && "checkbox" in pageProperty && pageProperty.checkbox;
      return (
        <Action
          title={(value ? "Uncheck " : "Check ") + databaseProperty.name}
          icon={value ? Icon.Checkmark : Icon.Circle}
          shortcut={shortcut}
          onAction={() => setPageProperty({ [databaseProperty.id]: { checkbox: !value } })}
        />
      );
    }

    case "select": {
      const value = pageProperty && "select" in pageProperty ? pageProperty.select?.id : null;
      return (
        <ActionPanel.Submenu title={title} icon={icon} shortcut={shortcut}>
          {(options as DatabasePropertyOption[])?.map((opt) => (
            <Action
              key={opt.id}
              icon={
                (opt.icon ? opt.icon : opt.id !== "_select_null_")
                  ? {
                      source: opt.icon ? opt.icon : value === opt.id ? Icon.Checkmark : Icon.Circle,
                      tintColor: notionColorToTintColor(opt.color),
                    }
                  : undefined
              }
              title={(opt.name ? opt.name : "Untitled") + (opt.icon && value === opt.id ? "  ✓" : "")}
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
      const value = pageProperty && "status" in pageProperty ? pageProperty.status?.id : null;
      return (
        <ActionPanel.Submenu title={title} icon={icon} shortcut={shortcut}>
          {(options as DatabasePropertyOption[])?.map((opt) => (
            <Action
              key={opt.id}
              icon={
                (opt.icon ? opt.icon : opt.id !== "_select_null_")
                  ? {
                      source: opt.icon ? opt.icon : value === opt.id ? Icon.Checkmark : Icon.Circle,
                      tintColor: notionColorToTintColor(opt.color),
                    }
                  : undefined
              }
              title={(opt.name ? opt.name : "Untitled") + (opt.icon && value === opt.id ? "  ✓" : "")}
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
      const value = pageProperty && "date" in pageProperty ? pageProperty.date : null;
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
      const value = pageProperty && "multi_select" in pageProperty ? pageProperty.multi_select : [];
      const multiSelectIds = value.map((selection) => selection.id);
      return (
        <ActionPanel.Submenu title={title} icon={icon} shortcut={shortcut}>
          {(options as DatabasePropertyOption[])?.map((opt) => {
            if (!opt.id) {
              return null;
            }
            return (
              <Action
                key={opt.id}
                icon={{
                  source: opt.id && multiSelectIds.includes(opt.id) ? Icon.Checkmark : Icon.Circle,
                  tintColor: notionColorToTintColor(opt.color),
                }}
                title={opt.name}
                onAction={() => {
                  if (!opt.id) {
                    return null;
                  }
                  if (opt.id && multiSelectIds.includes(opt.id)) {
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
      const value = pageProperty && "people" in pageProperty ? pageProperty.people : [];
      const peopleIds = value.map((user) => user.id);
      return (
        <ActionPanel.Submenu title={title} icon={icon} shortcut={shortcut}>
          <ActionPanel.Section>
            {value.map((user) => (
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
              .filter((user) => !peopleIds.includes(user.id))
              .map((user) => (
                <Action
                  key={user.id}
                  icon={user?.avatar_url ? { source: user.avatar_url, mask: Image.Mask.Circle } : undefined}
                  title={user?.name ? user.name : "Unknown"}
                  onAction={() =>
                    setPageProperty({
                      [databaseProperty.id]: {
                        people: [...value, { id: user.id }],
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
