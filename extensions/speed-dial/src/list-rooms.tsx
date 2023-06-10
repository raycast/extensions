import ListRooms from "./components/ListRooms";
import { RoomProvider } from "./contexts/RoomsContext";

export default function Command() {
  return (
    <RoomProvider>
      <ListRooms />
    </RoomProvider>
  );
}
