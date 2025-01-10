import { customAlphabet } from "nanoid";

export const nanoid = (length: number) => customAlphabet("23456789abcdefghjkmnpqrstuvwxyz", length);
