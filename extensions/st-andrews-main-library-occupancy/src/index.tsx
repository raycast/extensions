import { Color, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";

interface OverviewResponse {
  isLoading: boolean;
  staff: number;
  other: number;
  student: number;
  total: number;
  capacity: number;
}

interface TimeResponse {
  hours: number;
  minutes: number;
}

interface PCResponse {
  total: number;
  available: number;
  rooms: Room[];
}

interface Room {
  name: string;
  total: number;
  available: RoomDetal;
  inuse: RoomDetal;
}

interface RoomDetal {
  count: number;
}

export default function Command() {
  const { data: dataPeople, isLoading: loadingPeople } = useFetch<OverviewResponse>(
    "https://www.st-andrews.ac.uk/library/sentry-api/current-occupancy",
  );
  const { data: dataTime, isLoading: loadingTime } = useFetch<TimeResponse>(
    "https://www.st-andrews.ac.uk/library/sentry-api/average-visit",
  );
  const { data: dataPC } = useFetch<PCResponse>(
    "https://www.st-andrews.ac.uk/pc-availability/rest/4d8283a9-213d-30be-e054-00144ffbdcf6",
  );

  const numberEmojis = ["1️⃣", "2️⃣", "2️⃣", "3️⃣", "4️⃣"];

  return (
    <List isLoading={loadingPeople || loadingTime}>
      <List.Section title="People in the main library now 👥">
        <List.Item
          icon="🧑🏻‍🎓"
          title={"Student"}
          accessories={[
            {
              tag: {
                value: loadingPeople ? "Loading..." : `Total Student: ${dataPeople?.student}`,
                color: Color.Magenta,
              },
              tooltip: `Total Student: ${dataPeople?.student}`,
            },
          ]}
        />
        <List.Item
          icon="🧑🏻‍💻"
          title={"Staff"}
          accessories={[
            {
              tag: { value: loadingPeople ? "Loading..." : `Total Staff: ${dataPeople?.staff}`, color: Color.Magenta },
              tooltip: `Total Staff: ${dataPeople?.staff}`,
            },
          ]}
        />
        <List.Item
          icon="🚶🏻"
          title={"Visitor"}
          accessories={[
            {
              tag: {
                value: loadingPeople ? "Loading..." : `Total Visitor: ${dataPeople?.other}`,
                color: Color.Magenta,
              },
              tooltip: `Total Visitor: ${dataPeople?.other}`,
            },
          ]}
        />
        <List.Item
          icon="👥"
          title={"Current Total"}
          accessories={[
            {
              tag: { value: loadingPeople ? "Loading..." : `Capacity: ${dataPeople?.capacity}`, color: Color.Blue },
              tooltip: "Capacity",
            },
            {
              tag: {
                value: loadingPeople ? "Loading..." : `Current Total: ${dataPeople?.total}`,
                color: Color.Magenta,
              },
              tooltip: "Current Occupancy",
            },
          ]}
        />
        <List.Item
          icon="🕒"
          title={"Average visit length in last 7 days"}
          accessories={[
            {
              tag: {
                value: loadingTime ? "Loading..." : `${dataTime?.hours}h ${dataTime?.minutes}min`,
                color: Color.Purple,
              },
              tooltip: "Average Time",
            },
          ]}
        />
      </List.Section>
      <List.Section title="PCs occupancy now 🖥">
        {dataPC?.rooms.map((room, index) => (
          <List.Item
            key={index}
            icon={numberEmojis[index % numberEmojis.length]}
            title={room.name}
            accessories={[
              { tag: { value: `Total: ${room.total}`, color: Color.Blue }, tooltip: `Total PCs: ${room.total}` },
              {
                tag: { value: `In Use: ${room.inuse.count}`, color: Color.Magenta },
                tooltip: `In Use: ${room.inuse.count}`,
              },
              {
                tag: { value: `Available: ${room.available.count}`, color: Color.Green },
                tooltip: `Available: ${room.available.count}`,
              },
            ]}
          />
        ))}
      </List.Section>
    </List>
  );
}
