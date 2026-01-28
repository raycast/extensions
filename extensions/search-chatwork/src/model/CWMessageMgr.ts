import { CMRoomOwner } from "./CMRoomOwner";

export class CWMessageMgr {
  private _CWRooms: CMRoomOwner[] = [];
  constructor(rms: CMRoomOwner[]) {
    this._CWRooms = rms;
  }
  public get CWRooms(): CMRoomOwner[] {
    return this._CWRooms;
  }
  public addCWRoom(rm: CMRoomOwner): void {
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
