import React, { useState, useEffect } from "react";
import { LocalStorage } from "@raycast/api";
import { Room } from "../types";

type RoomContextType = {
  loading: boolean;
  rooms: Room[];
  setRooms: React.Dispatch<React.SetStateAction<Room[]>>;
  refreshRooms: () => void;
  addRoom: (room: Room) => Promise<void>;
  editRoomName: (arg: { url: string; name: string }) => Promise<void>;
  removeRoom: (room: Room) => Promise<void>;
};

const RoomContext = React.createContext<RoomContextType | undefined>(undefined);

type RoomProviderProps = {
  children: React.ReactNode;
};

const RoomProvider = ({ children }: RoomProviderProps) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    async function getRooms() {
      const rooms = await LocalStorage.getItem<string>("rooms");
      setRooms(JSON.parse(rooms ?? "[]") as Room[]);
    }
    getRooms().then(() => {
      setLoading(false);
    });
  }, []);

  const refreshRooms = () => {
    setLoading(true);
    LocalStorage.getItem<string>("rooms").then((rooms) => {
      setRooms(JSON.parse(rooms ?? "[]") as Room[]);
      setLoading(false);
    });
  };

  const addRoom = async (room: Room) => {
    // check if room already exists
    const exists = rooms.find((item) => item.url === room.url);
    if (exists) {
      throw new Error("Room already exists");
    }
    const newRooms = [...rooms, room];
    setRooms(newRooms);
    await LocalStorage.setItem("rooms", JSON.stringify(newRooms));
  };

  const editRoomName = async (args: { url: string; name: string }) => {
    const { url, name } = args;
    const newRooms = rooms.map((item) => {
      if (item.url === url) {
        return {
          ...item,
          name,
        };
      }
      return item;
    });
    setRooms(newRooms);
    await LocalStorage.setItem("rooms", JSON.stringify(newRooms));
  };

  const removeRoom = async (room: Room) => {
    const newRooms = rooms.filter((item) => item.url !== room.url);
    setRooms(newRooms);
    await LocalStorage.setItem("rooms", JSON.stringify(newRooms));
  };

  return (
    <RoomContext.Provider
      value={{
        rooms,
        loading,
        refreshRooms,
        setRooms,
        addRoom,
        editRoomName,
        removeRoom,
      }}
    >
      {children}
    </RoomContext.Provider>
  );
};

export { RoomContext, RoomProvider };
