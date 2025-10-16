import { BaseSuccessResponse } from "./common";

export type AnnouncementCategory = {
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
  idx: string;
};
export type GetAnnouncementCategoriesResponse = BaseSuccessResponse & { data: AnnouncementCategory[] };
