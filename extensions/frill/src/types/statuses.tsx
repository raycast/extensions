import { BaseSuccessResponse } from "./common";

export type Status = {
  name: string;
  color: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
  idx: string;
};

export type GetStatusesResponse = BaseSuccessResponse & { data: Status[] };
export type CreateStatusRequest = {
  name: string;
  color?: string;
  is_completed?: boolean;
};
export type CreateStatusResponse = { data: Status; meta: [] };
export type UpdateStatusResponse = CreateStatusResponse;
export type UpdateStatusRequest = CreateStatusRequest;
export type DeleteStatusResponse = { success: true };
