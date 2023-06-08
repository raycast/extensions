import { tell } from "@/lib/apple-script";

export const getLibraryName = tell("Music", "get name of source 1");
export const activate = tell("Music", "activate");
