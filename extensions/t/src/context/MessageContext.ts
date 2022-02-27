import { createContext } from "react";
import { en, Message } from "../message";

export const defaultMessageContextValue: Messanger = (l) => en[l(Message)];
export const MessageContext = createContext(defaultMessageContextValue);

export type Messanger = (m: (l: typeof Message) => Message) => string;
