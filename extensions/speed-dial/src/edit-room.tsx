import { RoomProvider } from "./contexts/RoomsContext";
import EditRoomForm from "./components/EditRoomForm";
import { Room } from "./types";

export default function Command(props: { room: Room }) {
  const { room } = props;
  return (
    <RoomProvider>
      <EditRoomForm room={room} />
    </RoomProvider>
  );
}
