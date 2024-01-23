import { List, Toast, showToast, Icon, ActionPanel, Action, Detail, Color, open } from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { performance } from "perf_hooks";

import * as service from "./oauth/google";
import { CalendarEventDetails, Contact } from "./oauth/google";
import fetch from "node-fetch";
import { RRule } from "rrule";
import { usePromise } from "@raycast/utils";

const config = {
  DEBUG: false,
  LOGOUT_MODE: false,
  LOCAL_MODE: false,
};

const BACKEND_URL = config.LOCAL_MODE
  ? "http://localhost:3000/api/extract"
  : "https://sedona-olive.vercel.app/api/extract";

export default function Command() {
  const abortable = useRef<AbortController>();
  const [searchText, setSearchText] = useState("");

  const fetchEventDetails = async (message: string) => {
    const response = await fetch(BACKEND_URL, {
      method: "POST",
      body: JSON.stringify({ message, tzOffset: new Date().getTimezoneOffset() }),
    });

    const json = await response.json();
    return json as CalendarEventDetails;
  };

  const fetchGuestList = async (calendarEventDetails: CalendarEventDetails) => {
    const guests = await Promise.all(
      calendarEventDetails.guestList.map(async (guest: string | Contact) => {
        const matches = await service.searchOtherContacts(guest);
        if (!matches || matches.length === 0) {
          return { name: guest, emailAddress: null } as Contact;
        }

        if (!matches[0].name) {
          return { name: guest, emailAddress: matches[0].emailAddress } as Contact;
        }

        return matches[0];
      }),
    );

    // If contacts is not empty, add your own information to the attendees list for aesthetics
    if (guests.length > 0) {
      const userProfile = await service.getUserProfile();
      guests.push({ name: userProfile.name, emailAddress: userProfile.email, self: true } as Contact);
    }

    return guests;
  };

  const fetchData = async (message: string) => {
    showToast({ style: Toast.Style.Animated, title: "Parsing message using AI..." });
    const startTime = performance.now();

    const calendarEventDetails = await fetchEventDetails(message);
    if (!calendarEventDetails) {
      return;
    }

    const enrichedGuestList = await fetchGuestList(calendarEventDetails);

    let enrichedLocation;
    if (calendarEventDetails.eventLocation) {
      enrichedLocation = await service.enrichLocation(calendarEventDetails.eventLocation);
    }

    // If 1:1 meeting, overwrite the event title to be in the format "OTHER PERSON // YOURSELF ${previous title}"
    // E.g. turns "Coffee" -> "Tiger // Patrick Coffee". Ignores redundant "meet"/"meeting" event names
    let enrichedTitle = calendarEventDetails.eventTitle;
    if (enrichedGuestList.length === 2) {
      const userProfile = await service.getUserProfile();
      enrichedTitle = `${enrichedGuestList[0].name.split(" ")[0]} // ${userProfile.name.split(" ")[0]}`;
      if (!calendarEventDetails.eventTitle.toLowerCase().includes("meet")) {
        enrichedTitle += ` ${calendarEventDetails.eventTitle}`;
      }
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Display duration (in ms units) in human readable seconds.milliseconds
    const timingString = duration < 1000 ? `${duration.toFixed(2)}ms` : `${(duration / 1000).toFixed(2)}s`;
    showToast({ style: Toast.Style.Animated, title: `Done! (${timingString})` });

    return {
      ...calendarEventDetails,
      guestList: enrichedGuestList,
      eventLocation: enrichedLocation,
      eventTitle: enrichedTitle,
    };
  };

  const { data: eventDetails, isLoading } = usePromise(fetchData, [searchText], {
    execute: searchText.length > 0,
    abortable,
  });

  useEffect(() => {
    (async () => {
      try {
        await service.authorize();
      } catch (error) {
        console.error(error);
        showToast({ style: Toast.Style.Failure, title: String(error) });
      }
    })();
  }, [service, searchText]);

  if (config.LOGOUT_MODE) {
    return (
      <Detail
        actions={
          <ActionPanel>
            <Action
              title="Logout"
              icon={Icon.Logout}
              onAction={async () => {
                try {
                  await service.logout();
                  showToast({ style: Toast.Style.Success, title: "Success" });
                } catch (error) {
                  console.error(error);
                  showToast({ style: Toast.Style.Failure, title: String(error) });
                }
              }}
            />
          </ActionPanel>
        }
        markdown={"# Press enter to logout"}
      />
    );
  }

  if (config.DEBUG) {
    const debugMd = `# Debug Mode`;
    return <Detail markdown={debugMd} />;
  }

  // Returns a human-readable string of the date, including the date if it is different from the previous date
  // E.g. Wed, Jan 24, 6PM
  const dateToHumanString = (date: Date, previousDate?: Date) => {
    // If previousDate is present and the dates are the same, only include the time
    const baseOptions: Intl.DateTimeFormatOptions = {
      hour: "numeric",
      minute: date.getMinutes() === 0 ? undefined : "2-digit",
      hour12: true,
    };
    if (previousDate && date.toDateString() === previousDate.toDateString()) {
      return date.toLocaleString("en-US", baseOptions);
    }

    const optionsWithDate: Intl.DateTimeFormatOptions = {
      ...baseOptions,
      weekday: "short",
      month: "short",
      day: "numeric",
    };

    // Only include year if it is not the current year
    if (date.getFullYear() !== new Date().getFullYear()) {
      optionsWithDate.year = "numeric";
    }

    return date.toLocaleString("en-US", optionsWithDate);
  };

  const scheduleEventAction = (
    <ActionPanel>
      <Action
        title="Schedule Event"
        icon={Icon.Calendar}
        onAction={async () => {
          try {
            if (eventDetails) {
              const eventUrl = await service.createCalendarEvent(eventDetails, eventDetails.guestList);
              open(eventUrl);
              showToast({ style: Toast.Style.Success, title: "Success" });
            }
          } catch (error) {
            console.error(error);
            showToast({ style: Toast.Style.Failure, title: String(error) });
          }
        }}
      />
    </ActionPanel>
  );

  return (
    <List
      searchBarPlaceholder="Enter event description"
      isLoading={searchText.length > 0 && isLoading}
      onSearchTextChange={setSearchText}
      throttle
    >
      {searchText.length == 0 && <List.EmptyView icon={Icon.Calendar} title="Start describing your event" />}
      {searchText.length > 0 && isLoading && <List.EmptyView icon={Icon.LightBulb} title="Parsing..." />}
      {eventDetails && !isLoading && (
        <>
          <List.Item
            title={"Title"}
            accessories={[{ tag: eventDetails.eventTitle }]}
            actions={eventDetails ? scheduleEventAction : undefined}
          />

          <List.Item
            title={"Time"}
            accessories={[
              { tag: dateToHumanString(new Date(eventDetails.eventStart)) },
              { text: "to" },
              { tag: dateToHumanString(new Date(eventDetails.eventEnd), new Date(eventDetails.eventStart)) },
            ]}
            actions={eventDetails ? scheduleEventAction : undefined}
          />

          <List.Item
            title={"Guests"}
            accessories={eventDetails.guestList
              .filter((guest) => !guest.self)
              .map((guest) => {
                return {
                  tag: {
                    value: `${guest?.name}${guest?.name && ": "}${guest?.emailAddress || "No match found"}`,
                    color: !guest?.emailAddress ? Color.Red : Color.SecondaryText,
                  },
                };
              })}
            actions={eventDetails ? scheduleEventAction : undefined}
          />

          <List.Item
            title={"Location"}
            accessories={
              eventDetails.eventLocation
                ? // If formattedAddress is present, append it in parens up to the second comma
                  // (e.g. "123 Main St, San Francisco, CA 94105, USA" => "123 Main St, San Francisco")
                  [
                    {
                      tag: {
                        value:
                          eventDetails.eventLocation.displayName.text +
                          ` (${
                            eventDetails.eventLocation.formattedAddress
                              ? eventDetails.eventLocation.formattedAddress.split(", ").slice(0, 2).join(", ")
                              : ""
                          })`,
                      },
                    },
                  ]
                : [{ tag: { value: "No location set" } }]
            }
            actions={eventDetails ? scheduleEventAction : undefined}
          />

          {eventDetails.eventRecurrence && (
            <List.Item
              title={"Recurrence"}
              accessories={[{ tag: { value: RRule.fromString(eventDetails.eventRecurrence).toText() } }]}
            />
          )}
        </>
      )}
    </List>
  );
}
