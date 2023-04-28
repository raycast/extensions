import { environment } from "@raycast/api";

export const apiUrl = environment.isDevelopment ? "http://localhost:8080/api" : "https://dmb.lol/api";
