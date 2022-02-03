import { ActionPanel, Icon, ImageLike, showToast, ToastStyle, ImageMask, KeyboardShortcut } from "@raycast/api";
import {
  DatabaseProperty,
  DatabasePropertyOption,
  User,
  notionColorToTintColor,
  patchPage,
  PagePropertyType,
} from "../utils/notion";
import moment from "moment";

export function ActionEditPageProperty(props: {
  databaseProperty: DatabaseProperty;
  pageId: string;
  pageProperty?: PagePropertyType;
  onForceRerender?: () => void;
  shortcut?: KeyboardShortcut;
  icon?: ImageLike;
  customOptions?: DatabasePropertyOption[];
}): JSX.Element | null {
  const { databaseProperty, pageId, pageProperty, shortcut, onForceRerender } = props;

  const title = "Set " + databaseProperty.name;
  const icon = props.icon ? props.icon : "icon/" + databaseProperty.type + ".png";
  const options = props.customOptions ? props.customOptions : databaseProperty.options || [];

  async function setPageProperty(patch: Parameters<typeof patchPage>[1]) {
    showToast(ToastStyle.Animated, "Updating Property");
    const updatedPage = await patchPage(pageId, patch);
    if (updatedPage && updatedPage.id) {
      showToast(ToastStyle.Success, "Property Updated");
      onForceRerender?.();
    }
  }

  switch (databaseProperty.type) {
    case "checkbox": {
      const value = !!pageProperty && "checkbox" in pageProperty && pageProperty.checkbox;
      return (
        <ActionPanel.Item
          title={(value ? "Uncheck " : "Check ") + databaseProperty.name}
          icon={"icon/" + databaseProperty.type + "_" + value + ".png"}
          shortcut={shortcut}
          onAction={function () {
            setPageProperty({ [databaseProperty.id]: { checkbox: !value } });
          }}
        />
      );
    }

    case "select": {
      const value = pageProperty && "select" in pageProperty ? pageProperty.select?.id : null;
      return (
        <ActionPanel.Submenu title={title} icon={icon} shortcut={shortcut}>
          {(options as DatabasePropertyOption[])?.map(function (opt) {
            return (
              <ActionPanel.Item
                key={`page-${pageId}-property-${databaseProperty.id}-select-option-${opt.id}`}
                icon={
                  (opt.icon ? opt.icon : opt.id !== "_select_null_")
                    ? {
                        source: opt.icon ? opt.icon : value === opt.id ? Icon.Checkmark : Icon.Circle,
                        tintColor: notionColorToTintColor(opt.color),
                      }
                    : undefined
                }
                title={(opt.name ? opt.name : "Untitled") + (opt.icon && value === opt.id ? "  ✓" : "")}
                onAction={function () {
                  if (opt.id && opt.id !== "_select_null_") {
                    setPageProperty({ [databaseProperty.id]: { select: { id: opt.id } } });
                  } else {
                    setPageProperty({ [databaseProperty.id]: { select: null } });
                  }
                }}
              />
            );
          })}
        </ActionPanel.Submenu>
      );
    }

    case "date": {
      const value = pageProperty && "date" in pageProperty ? pageProperty.date : null;
      return (
        <ActionPanel.Submenu title={title} icon={icon} shortcut={shortcut}>
          <ActionPanel.Submenu
            key={`page-${pageId}-property-${databaseProperty.id}-date-start`}
            title={value?.start ? moment(value.start).fromNow() : "No Date"}
            icon={"icon/date_start.png"}
          >
            <ActionPanel.Item
              key={`page-${pageId}-property-${databaseProperty.id}-date-start-picker`}
              title="Now"
              onAction={function () {
                const date = value ? value : { start: new Date(Date.now()).toISOString() };
                date.start = new Date(Date.now()).toISOString();
                setPageProperty({ [databaseProperty.id]: { date } });
              }}
            />
          </ActionPanel.Submenu>
          <ActionPanel.Submenu
            key={`page-${pageId}-property-${databaseProperty.id}-date-end`}
            title={value?.end ? moment(value.end).fromNow() : "No Date"}
            icon={"icon/date_end.png"}
          >
            <ActionPanel.Item
              key={`page-${pageId}-property-${databaseProperty.id}-date-end-picker`}
              title="Now"
              onAction={function () {
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
          {(options as DatabasePropertyOption[])?.map(function (opt) {
            if (!opt.id) {
              return null;
            }
            return (
              <ActionPanel.Item
                key={`page-${pageId}-property-${databaseProperty.id}-multi-select-option-${opt.id}`}
                icon={{
                  source: opt.id && multiSelectIds.includes(opt.id) ? Icon.Checkmark : Icon.Circle,
                  tintColor: notionColorToTintColor(opt.color),
                }}
                title={opt.name}
                onAction={function () {
                  if (!opt.id) {
                    return null;
                  }
                  if (opt.id && multiSelectIds.includes(opt.id)) {
                    setPageProperty({
                      [databaseProperty.id]: {
                        multi_select: value.filter(function (o) {
                          return o.id !== opt.id;
                        }),
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
          <ActionPanel.Section key={`page-${pageId}-property-${databaseProperty.id}-people-selected`}>
            {value.map(function (user) {
              return (
                <ActionPanel.Item
                  key={`page-${pageId}-property-${databaseProperty.id}-people-selected-${user.id}`}
                  icon={
                    "avatar_url" in user && user.avatar_url
                      ? { source: user.avatar_url, mask: ImageMask.Circle }
                      : undefined
                  }
                  title={("name" in user ? user.name : "Unknown") + "  ✓"}
                  onAction={function () {
                    setPageProperty({
                      [databaseProperty.id]: {
                        people: value.filter(function (o) {
                          return o.id !== user.id;
                        }),
                      },
                    });
                  }}
                />
              );
            })}
          </ActionPanel.Section>
          <ActionPanel.Section key={`page-${pageId}-property-${databaseProperty.id}-people-not-selected`}>
            {(options as User[])?.map(function (user) {
              if (!peopleIds.includes(user.id)) {
                return (
                  <ActionPanel.Item
                    key={`page-${pageId}-property-${databaseProperty.id}-people-not-selected-${user.id}`}
                    icon={user?.avatar_url ? { source: user.avatar_url, mask: ImageMask.Circle } : undefined}
                    title={user?.name ? user.name : "Unknown"}
                    onAction={async function () {
                      setPageProperty({
                        [databaseProperty.id]: {
                          multi_select: [...value, { id: user.id }],
                        },
                      });
                    }}
                  />
                );
              }
            })}
          </ActionPanel.Section>
        </ActionPanel.Submenu>
      );
    }

    default:
      return null;
  }
}
