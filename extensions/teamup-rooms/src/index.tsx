import { ActionPanel, List, Action, getPreferenceValues, Icon, showHUD, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import got from "got";
import { getColor } from "./colors";

const times: TimeObject[] = [
  {
    text: "15 minutes",
    minutes: "15",
  },
  {
    text: "30 minutes",
    minutes: "30",
  },
  {
    text: "45 minutes",
    minutes: "45",
  },
  {
    text: "1 hour",
    minutes: "60",
  },
  {
    text: "90 minutes",
    minutes: "90",
  },
  {
    text: "2 hours",
    minutes: "180",
  },
];

// Error is transformed and message is left off to make up for limited space in the toast
const getErrorMessage = (errorId: string, errorTitle?: string) => {
  switch (errorId) {
    case "invalid_api_key":
      return {
        title: "Invalid API Key",
        message: "You can update your API key in the extension settings.",
      };
    case "auth_required":
      return {
        title: "Password Required",
        message:
          "This calendar is password protected. Check that you have provided the correct password in the extension settings.",
      };
    case "event_overlapping":
      return {
        title: "Scheduling Conflict",
        message: "This room is already booked.",
      };
    case "calendar_not_found":
      return {
        title: "Calendar Not Found",
        message:
          "The calendar you selected does not exist. Check that you have the proper API key configured in the extension settings.",
      };
    default:
      return {
        title: errorTitle || "An error occured",
      };
  }
};

const createAuth = (authValues: AuthValues) => {
  const apiRoot = `https://api.teamup.com/${authValues.calendar}`;
  const headers = {
    "Teamup-Token": authValues.token,
    "Teamup-Password": authValues.calendar_password,
  };

  return { apiRoot, headers };
};

const getCalendar = async (auth: GotConfig) => {
  return await got(`${auth.apiRoot}/events`, {
    headers: { ...auth.headers },
  })
    .then((res) => {
      return JSON.parse(res.body);
    })
    .catch((err) => {
      const errorBody = JSON.parse(err.response.body).error;
      const error: ToastError = getErrorMessage(errorBody.id, errorBody.title);
      throw error;
    });
};

const getSubcalendars = async (auth: GotConfig) => {
  return await got(`${auth.apiRoot}/subcalendars`, {
    headers: { ...auth.headers },
  })
    .then((res) => {
      return JSON.parse(res.body);
    })
    .catch((err) => {
      const error: ToastError = getErrorMessage(JSON.parse(err.response.body).error.id);
      throw error;
    });
};

const bookRoom = async (
  auth: GotConfig,
  roomId: TeamupSubcalendar["id"],
  duration: number,
  title: string,
  start?: Date
) => {
  const start_dt = start || new Date();
  const end_dt = new Date(start_dt.getTime() + duration * 60000);
  const event = await got
    .post(`${auth.apiRoot}/events`, {
      headers: { ...auth.headers },
      json: {
        title,
        start_dt: `${start_dt.toISOString().split(".")[0]}Z`,
        end_dt: `${end_dt.toISOString().split(".")[0]}Z`,
        subcalendar_ids: [roomId],
      },
    })
    .then((res) => {
      return JSON.parse(res.body);
    })
    .catch((err) => {
      if (JSON.parse(err?.response?.body).error) {
        const { id, title } = JSON.parse(err.response?.body).error;
        return { error: getErrorMessage(id, title) };
      } else
        return {
          error: {
            title: "An unknown error has occured",
          },
        };
    });

  return event;
};

function TimeDropdown(props: { onTimeChange: (x: TimeObject) => void }) {
  const { onTimeChange } = props;

  return (
    <List.Dropdown
      tooltip="How long do you need a room?"
      defaultValue={"30"}
      onChange={(minutes) => {
        onTimeChange(times.filter((time) => time.minutes === minutes)[0]);
      }}
    >
      <List.Dropdown.Section title="Booking Duration">
        {times.map((time) => (
          <List.Dropdown.Item key={time.minutes} title={time.text} value={time.minutes} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

export default function Command() {
  const [openRooms, setOpenRooms] = useState<TeamupSubcalendar[] | undefined>(undefined);
  const [minutesString, setMinutesString] = useState<MinuteString>("30");
  const [minutes, setMinutes] = useState<MinuteNumber>(30);
  const [loadingError, setLoadingError] = useState<ToastError | undefined>(undefined);

  const startDt = new Date();
  const endDt = new Date(startDt.getTime() + minutes * 60000);

  const { calendar, token, calendar_password, default_title: defaultTitle } = getPreferenceValues<Preferences>();

  const auth = createAuth({ calendar, token, calendar_password });

  useEffect(() => {
    setOpenRooms(undefined);
    loadRooms();
  }, [minutes]);

  useEffect(() => {
    if (minutesString) setMinutes(parseInt(minutesString));
  }, [minutesString]);

  const quickAddEvent = async (roomId: TeamupSubcalendar["id"]) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Booking room",
    });

    const event: TeamupEvent | WrappedError = await bookRoom(auth, roomId, minutes, defaultTitle);

    if (isError(event)) {
      toast.style = Toast.Style.Failure;
      toast.title = event.error.title;
      toast.message = event.error.message;
    } else {
      toast.hide();
      setOpenRooms(openRooms?.filter((room: TeamupSubcalendar) => room.id !== roomId));
      await showHUD("🗓️ Room booked");
    }
  };

  const loadRooms = async () => {
    let events: TeamupEvent[] = [];
    let rooms: TeamupSubcalendar[] = [];
    const occupiedRooms: number[] = [];

    setLoadingError(undefined);

    await getCalendar(auth)
      .then((res) => (events = res.events))
      .catch((err: ToastError) => {
        events = [];
        setLoadingError(err);
      });
    await getSubcalendars(auth)
      .then((res) => (rooms = res.subcalendars))
      .catch((err: ToastError) => {
        rooms = [];
        setLoadingError(err);
      });

    events = events
      .map((event: TeamupEvent) => {
        return {
          ...event,
          start_dt: new Date(event.start_dt),
          end_dt: new Date(event.end_dt),
        };
      })
      .filter((event: TeamupEvent) => event.start_dt < endDt)
      .filter((event: TeamupEvent) => event.end_dt > startDt);

    for (const ev in events) {
      occupiedRooms.push(events[ev].subcalendar_id);
    }

    rooms = rooms.filter((room: TeamupSubcalendar) => {
      return occupiedRooms.indexOf(room.id) === -1;
    });

    setOpenRooms(rooms);
  };

  return (
    <List
      searchBarPlaceholder="Filter rooms"
      isLoading={openRooms === undefined}
      searchBarAccessory={
        <TimeDropdown
          onTimeChange={(time: TimeObject) => {
            setMinutesString(time.minutes);
          }}
        />
      }
    >
      {openRooms?.length === 0 ? (
        <List.EmptyView
          title={loadingError ? loadingError.title : "No rooms are open"}
          description={
            loadingError
              ? loadingError.message
              : "If your schedule permits, try checking for rooms available for a shorter amount of time."
          }
          icon={loadingError ? Icon.ExclamationMark : undefined}
        />
      ) : (
        openRooms?.map((room: TeamupSubcalendar) => (
          <List.Item
            key={room.id}
            title={room.name}
            icon={{
              source: Icon.Calendar,
              tintColor: room.color ? getColor(room.color) : undefined,
            }}
            actions={
              <ActionPanel>
                <Action title="Quick book" onAction={() => quickAddEvent(room.id)} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

type MinuteNumber = 15 | 30 | 45 | 60 | 90 | 180 | number;
type MinuteString = "15" | "30" | "45" | "60" | "90" | "180" | string;

interface AuthValues {
  calendar: string;
  token: string;
  calendar_password?: string;
}

interface Preferences extends AuthValues {
  default_title: string;
}

interface GotConfig {
  apiRoot: string;
  headers: GotHeaders;
}

interface GotHeaders {
  "Teamup-Token": string;
}

interface TimeObject {
  text: string;
  minutes: string;
}

interface ToastError {
  title: string;
  message?: string;
}

interface WrappedError {
  error: ToastError;
}

interface TeamupEvent {
  id: string;
  subcalendar_id: number;
  subcalendar_ids: number[];
  all_day?: boolean;
  rrule?: string;
  title?: string;
  who?: string;
  location?: string;
  notes?: string;
  readonly?: boolean;
  start_dt: Date;
  end_dt: Date;
  creation_dt: Date;
}

interface TeamupSubcalendar {
  id: number;
  name: string;
  active?: boolean;
  color?: number;
  overlap?: boolean;
  readonly?: boolean;
  creation_dt?: Date;
  update_dt?: Date;
}

function isError(event: WrappedError | TeamupEvent): event is WrappedError {
  return "error" in event;
}
