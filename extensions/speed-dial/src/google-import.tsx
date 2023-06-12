import { RoomProvider } from "./contexts/RoomsContext";
import ListCalendars from "./components/ListCalendars";

export default function ImportFromGoogle() {
  return (
    <RoomProvider>
      <ListCalendars />
    </RoomProvider>
  );
}
