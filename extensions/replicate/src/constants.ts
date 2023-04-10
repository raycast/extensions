import { environment } from "@raycast/api";

const { supportPath } = environment;

export const DB_FILE_PATH = supportPath + "/replicate.db";
export const PREDICTIONS_URL = "https://api.replicate.com/v1/predictions";
