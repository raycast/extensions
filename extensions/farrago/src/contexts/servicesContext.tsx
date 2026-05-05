import { ReactNode, createContext, useContext, useMemo, useRef, useState } from "react";

import useInterval from "@/hooks/useInterval";
import { FarragoOscReceiver } from "@/services/farrago-osc/farragoOscReceiver";
import { FarragoOscSender } from "@/services/farrago-osc/farragoOscSender";
import { FarragoDataParser } from "@/services/farrago/farragoDataParser";
import { FarragoDataSource } from "@/services/farrago/farragoDataSource";
import {
  initializeFarragoDataParser,
  initializeFarragoDataSource,
  initializeFarragoOscReceiver,
  initializeFarragoOscSender,
} from "@/services/initializers";

const DB_REFRESH_INTERVAL_MS = 10000; // how often to check for updates in Farrago's data directory

type ServiceMap = {
  dataParser: FarragoDataParser;
  dataSource: FarragoDataSource;
  oscSender: FarragoOscSender;
  oscReceiver: FarragoOscReceiver;
};

const ServicesContext = createContext<ServiceMap | null>(null);

export const ServicesProvider = ({ children }: { children: ReactNode }) => {
  const refs = useRef<Partial<ServiceMap>>({});

  const services = useMemo(
    () =>
      new Proxy({} as ServiceMap, {
        get: (_target, prop: keyof ServiceMap) => {
          if (!(prop in refs.current)) {
            switch (prop) {
              case "dataParser":
                refs.current[prop] = initializeFarragoDataParser();
                break;
              case "dataSource": {
                const ds = initializeFarragoDataSource();
                ds.populateDb(services.dataParser.getFreshSetsParsed());
                refs.current[prop] = ds;
                break;
              }
              case "oscSender":
                refs.current[prop] = initializeFarragoOscSender();
                break;
              case "oscReceiver":
                refs.current[prop] = initializeFarragoOscReceiver();
                break;
              default:
                throw new Error(`Unknown service: ${String(prop)}`);
            }
          }
          return refs.current[prop];
        },
      }),
    [],
  );

  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
};

export function useServices() {
  const context = useContext(ServicesContext);
  if (!context) throw new Error("useServices must be used within a ServicesProvider");
  return context;
}

export function useLatestDbUpdate() {
  const { dataParser, dataSource } = useServices();
  const [latestDbUpdate, setLatestDbUpdate] = useState(dataParser.lastParsedSets);

  useInterval(() => {
    if (!dataParser.hasUpToDateSets()) {
      dataSource.emptyDb();
      dataSource.populateDb(dataParser.getFreshSetsParsed());
      setLatestDbUpdate(dataParser.lastParsedSets);
    }
  }, DB_REFRESH_INTERVAL_MS);

  return useMemo(() => latestDbUpdate, [latestDbUpdate]);
}
