import * as React from "react";
import type * as Types from "@ui/types";

interface TypeZabbixServer {
  value?: Types.LocalStorageZabbixServer;
}
export const ZabbixServer = React.createContext<TypeZabbixServer>({});
