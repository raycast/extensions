import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useMemo, useState } from "react";
import { ExtensionCalendarConfigurationItem } from "@/lib/extension/config";
import { useCalendars, useConfig } from "@/lib/extension/hooks";
import { RaycastGoogleOAuthService } from "@/lib/raycast";

function Command() {
  const { data: calendars, isLoading: isCalendarsLoading } = useCalendars();
  const { value: config, setValue: updateConfig, isLoading: isConfigLoading } = useConfig();
  const [showDetails, setShowDetails] = useState(false);

  const sortedCalendars = useMemo(() => {
    if (!calendars) {
      return null;
    }
    return calendars.sort((a, b) => {
      const aDisabled = config?.calendarConfiguration?.[a.id]?.disabled;
      const bDisabled = config?.calendarConfiguration?.[b.id]?.disabled;

      if (aDisabled && !bDisabled) {
        return 1;
      } else if (!aDisabled && bDisabled) {
        return -1;
      } else {
        return a.name.localeCompare(b.name);
      }
    });
  }, [calendars, config]);

  const isLoading = isCalendarsLoading || isConfigLoading;

  return (
    <List isShowingDetail={showDetails} isLoading={isLoading}>
      {config &&
        sortedCalendars?.map(({ id, name, timezone, description, location, hidden }) => {
          const isDisabled = config!.calendarConfiguration?.[id]?.disabled;

          const accessories: List.Item.Accessory[] = [];
          if (hidden) {
            accessories.push({
              icon: Icon.EyeDisabled,
              tag: { value: "Hidden", color: Color.SecondaryText },
              tooltip: "Calendar is configured as hidden in Google Calendar",
            });
          }
          if (isDisabled) {
            accessories.push({
              icon: Icon.Xmark,
              tag: { value: "Disabled", color: Color.Red },
              tooltip: "Events from this calendar are filtered out in the extension",
            });
          } else {
            accessories.push({ icon: Icon.Check, tag: { value: "Enabled", color: Color.Green } });
          }

          return (
            <List.Item
              key={id}
              title={name}
              accessories={accessories}
              actions={
                <ActionPanel>
                  <Action
                    title={isDisabled ? "Enable" : "Disable"}
                    onAction={() => {
                      const previousCalendarConfiguration = config?.calendarConfiguration[id];
                      const newCalendarConfiguration = {
                        ...previousCalendarConfiguration,
                        disabled: !isDisabled,
                      } satisfies ExtensionCalendarConfigurationItem;
                      const newConfig = {
                        ...config,
                        calendarConfiguration: { ...config!.calendarConfiguration, [id]: newCalendarConfiguration },
                      };
                      updateConfig(newConfig)
                        .then(() => {
                          showToast({
                            title: "Successfully updated calendar configuration",
                            message: `Calendar '${name}' is now ${isDisabled ? "hidden" : "visible"}`,
                            style: Toast.Style.Success,
                          });
                        })
                        .catch((err) => {
                          showToast({
                            title: "Failed to update calendar configuration",
                            style: Toast.Style.Failure,
                            message: err.message,
                          });
                        });
                    }}
                  />
                  <Action title="Toggle Details" onAction={() => setShowDetails(!showDetails)} />
                </ActionPanel>
              }
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      {description && <List.Item.Detail.Metadata.Label title={description} />}
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Link
                        title="Link"
                        text="Open in browser"
                        target={`https://calendar.google.com/calendar/u/0/embed?src=${id}`}
                      />
                      <List.Item.Detail.Metadata.Label title="Description" text={description} />
                      <List.Item.Detail.Metadata.Label title="Time zone" text={timezone} />
                      <List.Item.Detail.Metadata.Label title="Location" text={location} />
                      <List.Item.Detail.Metadata.Label title="Hidden" text={hidden ? "Yes" : "No"} />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
            />
          );
        })}
    </List>
  );
}

export default withAccessToken({ authorize: RaycastGoogleOAuthService.authorize })(Command);
