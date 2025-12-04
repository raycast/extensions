import React, { useMemo } from "react";
import { GroupedLight, Light, Room, Scene, Zone } from "../lib/types";
import { useMachine } from "@xstate/react";
import { HueMessage, SendHueMessage } from "./useHue";
import hueBridgeMachine from "../lib/hueBridgeMachine";

export function useHueBridgeMachine(
  setLights: React.Dispatch<React.SetStateAction<Light[]>>,
  setGroupedLights: React.Dispatch<React.SetStateAction<GroupedLight[]>>,
  setRooms: React.Dispatch<React.SetStateAction<Room[]>>,
  setZones: React.Dispatch<React.SetStateAction<Zone[]>>,
  setScenes: React.Dispatch<React.SetStateAction<Scene[]>>,
) {
  const machine = useMemo(() => hueBridgeMachine(setLights, setGroupedLights, setRooms, setZones, setScenes), []);

  const [hueBridgeState, send] = useMachine(machine);
  const sendHueMessage: SendHueMessage = (message: HueMessage) => {
    // xstate expects an event object; wrap the message string as a `{ type: ... }` event
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    send({ type: message.toUpperCase() } as any);
  };

  return {
    hueBridgeState,
    sendHueMessage,
  };
}
