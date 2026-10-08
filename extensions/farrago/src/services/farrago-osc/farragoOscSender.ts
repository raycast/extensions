import { OscSender, SupportedArgType } from "@/services/osc/oscSender";
import { DBSoundSet, DBSoundTile } from "@/types";

import {
  Endpoint,
  GlobalAction,
  InspectorAction,
  ListAction,
  MasterAction,
  TileAction,
  TransportAction,
} from "./types";
import { getTileBaseAddress } from "./utils";

export class FarragoOscSender extends OscSender {
  private async sendToFarrago(endpoint: Endpoint, args: Array<SupportedArgType>) {
    await super.send(endpoint, args);
  }

  async ping() {
    await this.sendToFarrago("/ping", [true]);
  }

  async runTileAction(action: TileAction, tile: DBSoundTile, args?: Array<SupportedArgType>) {
    await this.sendToFarrago(`${getTileBaseAddress(tile)}/${action}`, args ?? [true]);
  }

  async runSetAction(set: DBSoundSet, args?: Array<SupportedArgType>) {
    await this.sendToFarrago(`/set/${set.position}`, args ?? [true]);
  }

  async runTransportAction(action: TransportAction, args?: Array<SupportedArgType>) {
    await this.sendToFarrago(`/transport/${action}`, args ?? [true]);
  }

  async runMasterAction(action: MasterAction, args?: Array<SupportedArgType>) {
    await this.sendToFarrago(`/master/${action}`, args ?? [true]);
  }

  async runInspectorAction(action: InspectorAction, args?: Array<SupportedArgType>) {
    await this.sendToFarrago(`/inspector/${action}`, args ?? [true]);
  }

  async runListAction(action: ListAction, args?: Array<SupportedArgType>) {
    await this.sendToFarrago(`/list/${action}`, args ?? [true]);
  }

  async runGlobalAction(action: GlobalAction, args?: Array<SupportedArgType>) {
    await this.sendToFarrago(`/global/${action}`, args ?? [true]);
  }
}
