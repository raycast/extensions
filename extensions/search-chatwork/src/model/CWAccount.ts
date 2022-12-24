export class Account {
  private _account_id = 0;
  public get account_id(): number {
    return this._account_id;
  }

  public set account_id(value: number) {
    this._account_id = value;
  }

  private _name = "";
  public get name(): string {
    return this._name;
  }
  public set name(value: string) {
    this._name = value;
  }

  private _avatar_image_url = "";
  public get avatar_image_url(): string {
    return this._avatar_image_url;
  }

  public set avatar_image_url(value: string) {
    this._avatar_image_url = value;
  }
}
