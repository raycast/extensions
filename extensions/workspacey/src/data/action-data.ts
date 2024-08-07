import { ActionType } from "./actionType";

export type ActionData = {
  id: string;
  name: string;
  target: string;
  type: ActionType;
  argument?: string;
  useCustomApp: boolean;
};
