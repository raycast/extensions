import { OscReceiver } from "@/services/osc/oscReceiver";
import { DBSoundTile } from "@/types";

import { Endpoint, TileAction } from "./types";
import { getTileBaseAddress } from "./utils";

type OscMessageHandler<T = unknown> = (...values: T[]) => void;

export class FarragoOscReceiver extends OscReceiver {
  private addTypedHandler<T>(pattern: Endpoint | RegExp, handler: OscMessageHandler<T>) {
    const regexp = typeof pattern === "string" ? makeStrictRegExp(pattern) : pattern;
    const addedHandler = this.addMessageHandler(regexp, (msg) => {
      const values = msg.args.map((arg) => arg.value) as T[];
      handler(...values);
    });
    return () => this.removeMessageHandler(addedHandler);
  }

  subscribeToTileAction<T>(opts: { tile: DBSoundTile; action: TileAction; handler: OscMessageHandler<T> }) {
    const { tile, action, handler } = opts;
    return this.addTypedHandler<T>(`${getTileBaseAddress(tile)}/${action}`, handler);
  }

  subscribeToPing<T>(handler: OscMessageHandler<T>) {
    return this.addTypedHandler<T>(/.*/, handler);
  }
}

function makeStrictRegExp(endpoint: Endpoint) {
  return new RegExp(`^${endpoint}$`);
}
