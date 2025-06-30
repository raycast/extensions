import axios from "axios";
import { Application, EagleAPIResponse, Folder, Item } from "../@types/eagle";

export const instance = axios.create({
  baseURL: "http://localhost:41595/api/",
});

type Order = "CREATEDATE" | "FILESIZE" | "NAME" | "RESOLUTION";

type OrderBy = `${"" | "-"}${Order}`;

export function getItems(params: {
  limit?: number;
  orderBy?: OrderBy;
  keyword?: string;
  ext?: string;
  tags?: string;
  folders?: string;
}) {
  return instance.get<EagleAPIResponse<Item[]>>("/item/list", {
    params,
  });
}

export function getItemThumbnail(id: string) {
  return instance.get<EagleAPIResponse<string>>("/item/thumbnail", {
    params: {
      id,
    },
  });
}

export function getApplicationInfo() {
  return instance.get<EagleAPIResponse<Application>>("/application/info");
}

export function getFolderList() {
  return instance.get<EagleAPIResponse<Folder[]>>("/folder/list");
}

export default instance;
