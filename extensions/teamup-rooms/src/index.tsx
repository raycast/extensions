import { ActionPanel, List, Action, getPreferenceValues, Icon, showHUD, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import got from "got";
import { getColor } from "./colors";
import { Room } from "./types";

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

const createAuth = (authValues: AuthValues) => {
  const apiRoot = `https://api.teamup.com/${authValues.calendar}`;
  const headers = {
    "Teamup-Token": authValues.token,
  };

  return { apiRoot, headers };
};

const getCalendar = async (auth: GotConfig) => {
  const { body } = await got(`${auth.apiRoot}/events`, {
    headers: { ...auth.headers },
  });
  return body;
};

const bookRoom = async (auth: GotConfig, roomId: Room["id"], duration: number, title: string, start?: Date) => {
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
      if (err.code === "ERR_NON_2XX_3XX_RESPONSE" && JSON.parse(err.response?.body).error) {
        const { id, title } = JSON.parse(err.response?.body).error;
        return (() => {
          switch (id) {
            case "event_overlapping":
              return {
                error: {
                  title: "Scheduling Conflict",
                  message: "This room is already booked.",
                },
              };

            default:
              return {
                error: { title },
              };
          }
        })();
      } else
        return {
          error: {
            title: "An unknown error has occured",
          },
        };
    });

  return event;
};

const getSubcalendars = async (auth: GotConfig) => {
  const { body } = await got(`${auth.apiRoot}/subcalendars`, {
    headers: { ...auth.headers },
  });

  return body;
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
      {times.map((time) => (
        <List.Dropdown.Item key={time.minutes} title={time.text} value={time.minutes} />
      ))}
    </List.Dropdown>
  );
}

export default function Command() {
  const [openRooms, setOpenRooms] = useState<any>(undefined);
  const [timeString, setTimeString] = useState<string>("30 minutes");
  const [minutesString, setMinutesString] = useState<string>("30");
  const [minutes, setMinutes] = useState<number>(30);

  const startDt = new Date();
  const endDt = new Date(startDt.getTime() + minutes * 60000);

  const { calendar, token, default_title: defaultTitle } = getPreferenceValues<Preferences>();

  const auth = createAuth({ calendar, token });

  const quickAddEvent = async (roomId: Room["id"]) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Booking room",
    });

    const event: any = await bookRoom(auth, roomId, minutes, defaultTitle);

    if (event.error) {
      toast.style = Toast.Style.Failure;
      toast.title = event.error.title;
      toast.message = event.error.message;
    } else {
      toast.hide();
      setOpenRooms(openRooms.filter((room: Room) => room.id !== roomId));
      await showHUD("🗓️ Room booked");
    }
  };

  const loadRooms = async () => {
    let events: any;
    let rooms: any;
    const occupiedRooms: any = [];

    await getCalendar(auth).then((res) => (events = JSON.parse(res).events));
    await getSubcalendars(auth).then((res) => (rooms = JSON.parse(res).subcalendars));

    events = events
      .map((event: any) => {
        return {
          ...event,
          start_dt: new Date(event.start_dt),
          end_dt: new Date(event.end_dt),
        };
      })
      .filter((event: any) => event.start_dt < endDt)
      .filter((event: any) => event.end_dt > startDt);

    for (const ev in events) {
      occupiedRooms.push(events[ev].subcalendar_id);
    }

    rooms = rooms.filter((room: any) => {
      return occupiedRooms.indexOf(room.id) === -1;
    });

    setOpenRooms(rooms);
  };

  useEffect(() => {
    setOpenRooms(undefined);
    loadRooms();
  }, [minutes]);

  useEffect(() => {
    if (minutesString) setMinutes(parseInt(minutesString));
  }, [minutesString]);

  return (
    <List
      searchBarPlaceholder="Filter rooms"
      isLoading={openRooms === undefined}
      searchBarAccessory={
        <TimeDropdown
          onTimeChange={(time: TimeObject) => {
            setMinutesString(time.minutes);
            setTimeString(time.text);
          }}
        />
      }
    >
      {openRooms?.length === 0 ? (
        <List.EmptyView
          title="No rooms are open"
          description="If your schedule permits, try checking for rooms available for a shorter amount of time."
        />
      ) : (
        openRooms?.map((room: Room) => (
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

interface AuthValues {
  calendar: string;
  token: string;
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
