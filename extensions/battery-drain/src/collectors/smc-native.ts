import { readSMC } from "swift:../../swift";

export const readSmcKeys = (keys: string[]): Promise<Record<string, number>> => readSMC(keys);
