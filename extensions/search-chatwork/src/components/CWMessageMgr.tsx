import { CMRoom } from "./CMRoom";

export class CWMessageMgr {
  private _CWRooms: CMRoom[] = [];
  constructor(rms: CMRoom[]) {
    this._CWRooms = rms;
  }
  public get CWRooms(): CMRoom[] {
    return this._CWRooms;
  }
  public addCWRoom(rm: CMRoom): void {
    this._CWRooms.push(rm);
  }
  public removeCWRoom(roomId: number): void {
    for (let i = 0; i < this._CWRooms.length; i++) {
      if (this._CWRooms[i].CWRoom.room_id === roomId) {
        this._CWRooms.splice(i, 1);
      }
    }
  }
}
