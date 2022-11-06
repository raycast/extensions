import { ICWRoom } from "./ICWRoom";
import { ICWMessage } from "./ICWMessage";

export class CMRoom {
  private _CWRoom: ICWRoom;
  private _CWMessage: ICWMessage[] = [];

  constructor(rm: ICWRoom, msgs: ICWMessage[]) {
    this._CWRoom = rm;
    this._CWMessage = msgs;
  }

  public get CWRoom(): ICWRoom {
    return this._CWRoom;
  }
  public set CWRoom(value: ICWRoom) {
    this._CWRoom = value;
  }
  public get CWMessage(): ICWMessage[] {
    return this._CWMessage;
  }
  public set CWMessage_1(value: ICWMessage[]) {
    this._CWMessage = value;
  }
}
