export class CWRoom {
  private _room_id: number = Number.MIN_SAFE_INTEGER;
  public get room_id(): number {
    return this._room_id;
  }
  public set room_id(value: number) {
    this._room_id = value;
  }
  private _name = "";
  public get name(): string {
    return this._name;
  }
  public set name(value: string) {
    this._name = value;
  }
  private _type = "";
  public get type(): string {
    return this._type;
  }
  public set type(value: string) {
    this._type = value;
  }
  private _role = "";
  public get role(): string {
    return this._role;
  }
  public set role(value: string) {
    this._role = value;
  }
  private _sticky = false;
  public get sticky(): boolean {
    return this._sticky;
  }
  public set sticky(value: boolean) {
    this._sticky = value;
  }
  private _unread_num: number = Number.MIN_SAFE_INTEGER;
  public get unread_num(): number {
    return this._unread_num;
  }
  public set unread_num(value: number) {
    this._unread_num = value;
  }
  private _mention_num: number = Number.MIN_SAFE_INTEGER;
  public get mention_num(): number {
    return this._mention_num;
  }
  public set mention_num(value: number) {
    this._mention_num = value;
  }
  private _mytask_num: number = Number.MIN_SAFE_INTEGER;
  public get mytask_num(): number {
    return this._mytask_num;
  }
  public set mytask_num(value: number) {
    this._mytask_num = value;
  }
  private _message_num: number = Number.MIN_SAFE_INTEGER;
  public get message_num(): number {
    return this._message_num;
  }
  public set message_num(value: number) {
    this._message_num = value;
  }
  private _file_num: number = Number.MIN_SAFE_INTEGER;
  public get file_num(): number {
    return this._file_num;
  }
  public set file_num(value: number) {
    this._file_num = value;
  }
  private _task_num: number = Number.MIN_SAFE_INTEGER;
  public get task_num(): number {
    return this._task_num;
  }
  public set task_num(value: number) {
    this._task_num = value;
  }
  private _icon_path = "";
  public get icon_path(): string {
    return this._icon_path;
  }
  public set icon_path(value: string) {
    this._icon_path = value;
  }
  private _last_update_time: number = Number.MIN_SAFE_INTEGER;
  public get last_update_time(): number {
    return this._last_update_time;
  }
  public set last_update_time(value: number) {
    this._last_update_time = value;
  }
}
