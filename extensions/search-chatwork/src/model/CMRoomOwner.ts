import { CWRoom } from "./CWRoom";
import { CWMessage } from "./CWMessage";

export class CMRoomOwner {
  private _CWRoom: CWRoom;
  private _CWMessage: CWMessage[] = [];

  constructor(rm: CWRoom, msgs: CWMessage[]) {
    this._CWRoom = rm;
    this._CWMessage = msgs;
  }

  public get CWRoom(): CWRoom {
    return this._CWRoom;
  }
  public set CWRoom(value: CWRoom) {
    this._CWRoom = value;
  }
  public get CWMessage(): CWMessage[] {
    return this._CWMessage;
  }
  public set CWMessage_(value: CWMessage[]) {
    this._CWMessage = value;
  }
}
