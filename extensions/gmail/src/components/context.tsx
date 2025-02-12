import { gmail_v1 } from "@googleapis/gmail";
import { createContext } from "react";

export const GMailContext = createContext<gmail_v1.Schema$Label[] | undefined>(undefined);
