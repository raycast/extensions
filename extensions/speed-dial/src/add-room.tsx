import { RoomProvider } from "./contexts/RoomsContext";
import AddRoomForm from "./components/AddRoomForm";

export default function Command() {
  return (
    <RoomProvider>
      <AddRoomForm />
    </RoomProvider>
  );
}
