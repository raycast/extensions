import { ICWMessage } from "./ICWMessage";
import { ICWChatParser } from "./ICWChatParser";
import { IAccount } from "./ICWAccount";

export class CWMessage implements ICWMessage {
  constructor(ICWChatParser: ICWChatParser) {
    this.ICWChatParser = ICWChatParser;
  }
  private ICWChatParser: ICWChatParser;
  private _message_id: string;
  public get message_id(): string {
    return this._message_id;
  }
  public set message_id(value: string) {
    this._message_id = this.parseText(value);
  }
  private _account: IAccount;
  public get account(): IAccount {
    return this._account;
  }
  public set account(value: IAccount) {
    this._account = value;
  }
  private _body: string;
  public get body(): string {
    return this._body;
  }
  public set body(value: string) {
    this._body = value;
  }
  private _send_time: number;
  public get send_time(): number {
    return this._send_time;
  }
  public set send_time(value: number) {
    this._send_time = value;
  }
  private _update_time: number;
  public get update_time(): number {
    return this._update_time;
  }
  public set update_time(value: number) {
    this._update_time = value;
  }
  copyValueFromJson(json: CWMessage) {
    this._message_id = json.message_id;
    this._account = json.account;
    this._account = json.account;
    this._body = this.parseText(json.body);
    this._send_time = json.send_time;
    this._update_time = json.update_time;
  }
  /**
   * parse raw text provided by CW into readble text
   * @param params raw text provided by CW
   * @returns
   */
  parseText(params: string): string {
    return this.ICWChatParser.parseText(params);
  }
}
