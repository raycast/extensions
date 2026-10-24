import { ZabbixParamsTriggerGet } from "@api/zabbix/types";
import * as React from "react";

interface TypeProps {
  server?: string;
  params?: ZabbixParamsTriggerGet;
}
export const Props = React.createContext<TypeProps>({});

interface TypeDataFilterOptionsShowAck {
  value?: boolean;
  isLoading: boolean;
  setValue: (value: boolean) => Promise<void>;
}
export const DataFilterOptionsShowAck =
  React.createContext<TypeDataFilterOptionsShowAck>({
    isLoading: true,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setValue: async (value: boolean) => {},
  });
