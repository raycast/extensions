import { Dispatch, SetStateAction } from "react";

import { RoomProvider } from "./contexts/RoomsContext";
import EditRoomForm from "./components/EditRoomForm";
import { Room } from "./types";

export default function Command(
  props: JSX.IntrinsicAttributes & { room: Room; setRefreshKey: Dispatch<SetStateAction<number>> }
) {
  return (
    <RoomProvider>
      <EditRoomForm {...props} />
    </RoomProvider>
  );
}
