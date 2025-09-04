import Bonjour, { Service } from "bonjour-service";
import { useEffect, useMemo, useState } from "react";

type BonjourOptions = { filter?: (service: Service) => boolean };

export function useBonjour(opts: BonjourOptions = {}) {
  const [devices, setDevices] = useState<Service[]>([] as Service[]);

  const bonjour = useMemo(() => {
    return new Bonjour();
  }, []);

  useEffect(() => {
    bonjour.find({ type: "http" }, (service) => {
      if (opts.filter && !opts.filter(service)) return;
      if (!service) return;

      setDevices((prevDevices) => {
        if (prevDevices.find((d) => d.host === service.host)) {
          return prevDevices;
        }

        return [...prevDevices, service];
      });
    });
  }, [bonjour, opts]);

  return devices;
}
