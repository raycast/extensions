import { useMemo } from "react";
import { useMachine } from "@xstate/react";
import { HueMessage, SendHueMessage } from "./useHue";
import hueBridgeMachine from "../lib/hueBridgeMachine";

export function useHueBridgeMachine() {
  const machine = useMemo(hueBridgeMachine, []);

  const [hueBridgeState, send] = useMachine(machine);
  const sendHueMessage: SendHueMessage = (message: HueMessage) => {
    send({ type: message.toUpperCase() });
  };

  return {
    hueBridgeState,
    sendHueMessage,
  };
}
