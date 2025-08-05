import { createClient } from "pexels";
import { apikey } from "../types/preferences";

export const pexelsClient = createClient(apikey);
