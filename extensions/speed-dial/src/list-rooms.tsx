import { LaunchProps } from "@raycast/api";

import ListRooms from "./components/ListRooms";
import { RoomProvider } from "./contexts/RoomsContext";

interface Args {
  room: string;
}

export default function Command(props: LaunchProps<{ arguments: Args }>) {
  return (
    <RoomProvider>
      <ListRooms name={props.arguments.room} />
    </RoomProvider>
  );
}
