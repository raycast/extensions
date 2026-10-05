import { useCachedPromise } from "@raycast/utils";
import { getLights } from "../api/lights";
import { getRooms, getGroupedLights } from "../api/rooms";
import { getScenes } from "../api/scenes";
import type {
  LightGet as Light,
  RoomGet as Room,
  GroupedLightGet as GroupedLight,
  SceneGet as Scene,
} from "../api/generated/src/models";
import { getCredentials } from "../api/client";

export function useLights() {
  return useCachedPromise(
    async () => {
      const credentials = getCredentials();
      if (!credentials) {
        return [];
      }
      return getLights();
    },
    [],
    {
      keepPreviousData: true,
    },
  );
}

export function useRooms() {
  return useCachedPromise(
    async () => {
      const credentials = getCredentials();
      if (!credentials) {
        return [];
      }
      return getRooms();
    },
    [],
    {
      keepPreviousData: true,
    },
  );
}

export function useGroupedLights() {
  return useCachedPromise(
    async () => {
      const credentials = getCredentials();
      if (!credentials) {
        return [];
      }
      return getGroupedLights();
    },
    [],
    {
      keepPreviousData: true,
    },
  );
}

export function useScenes() {
  return useCachedPromise(
    async () => {
      const credentials = getCredentials();
      if (!credentials) {
        return [];
      }
      return getScenes();
    },
    [],
    {
      keepPreviousData: true,
    },
  );
}

// Combined hook for lights with room information
export function useLightsWithRooms(): {
  lights: Light[];
  rooms: Room[];
  groupedLights: GroupedLight[];
  scenes: Scene[];
  isLoading: boolean;
  error: Error | undefined;
  revalidate: () => Promise<void>;
} {
  const lightsResult = useLights();
  const roomsResult = useRooms();
  const groupedLightsResult = useGroupedLights();
  const scenesResult = useScenes();

  const revalidate = async () => {
    // Revalidate sequentially with small delays to avoid rate limiting (HTTP 429)
    await lightsResult.revalidate();
    await new Promise((resolve) => setTimeout(resolve, 150));
    await roomsResult.revalidate();
    await new Promise((resolve) => setTimeout(resolve, 150));
    await groupedLightsResult.revalidate();
    await new Promise((resolve) => setTimeout(resolve, 150));
    await scenesResult.revalidate();
  };

  return {
    lights: lightsResult.data ?? [],
    rooms: roomsResult.data ?? [],
    groupedLights: groupedLightsResult.data ?? [],
    scenes: scenesResult.data ?? [],
    isLoading:
      lightsResult.isLoading || roomsResult.isLoading || groupedLightsResult.isLoading || scenesResult.isLoading,
    error: lightsResult.error || roomsResult.error || groupedLightsResult.error || scenesResult.error,
    revalidate,
  };
}

// Combined hook for scenes with room information
export function useScenesWithRooms(): {
  scenes: Scene[];
  rooms: Room[];
  isLoading: boolean;
  error: Error | undefined;
  revalidate: () => Promise<void>;
} {
  const scenesResult = useScenes();
  const roomsResult = useRooms();

  const revalidate = async () => {
    // Revalidate sequentially with small delay to avoid rate limiting (HTTP 429)
    await scenesResult.revalidate();
    await new Promise((resolve) => setTimeout(resolve, 150));
    await roomsResult.revalidate();
  };

  return {
    scenes: scenesResult.data ?? [],
    rooms: roomsResult.data ?? [],
    isLoading: scenesResult.isLoading || roomsResult.isLoading,
    error: scenesResult.error || roomsResult.error,
    revalidate,
  };
}

// Helper to find room for a light
export function findRoomForLight(light: Light, rooms: Room[]): Room | undefined {
  const deviceId = light.owner?.rid;
  if (!deviceId) return undefined;
  return rooms.find((room) => room.children?.some((child) => child.rid === deviceId));
}

// Helper to find grouped light for a room
export function findGroupedLightForRoom(room: Room, groupedLights: GroupedLight[]): GroupedLight | undefined {
  const groupedLightRef = room.services?.find((s) => s.rtype === "grouped_light");
  if (!groupedLightRef) return undefined;
  return groupedLights.find((gl) => gl.id === groupedLightRef.rid);
}

// Helper to get room name from room ID
export function getRoomName(roomId: string, rooms: Room[]): string {
  const room = rooms.find((r) => r.id === roomId);
  return room?.metadata?.name ?? "Unknown Room";
}
