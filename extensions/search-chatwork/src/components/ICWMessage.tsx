import { IAccount } from "./ICWAccount";
export interface ICWMessage {
  message_id: string;
  account: IAccount;
  body: string;
  send_time: number;
  update_time: number;
}
