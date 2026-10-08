import Bonjour, { Service } from "bonjour-service";
import { useEffect, useState } from "react";

type BonjourOptions = { filter?: (service: Service) => boolean };

export function useBonjour(opts: BonjourOptions = {}) {
  const [devices, setDevices] = useState<Service[]>([] as Service[]);

  useEffect(() => {
    const bonjour = new Bonjour();

    const browser = bonjour.find({ type: "http" }, (service) => {
      if (opts.filter && !opts.filter(service)) return;
      if (!service) return;

      setDevices((prevDevices) => {
        if (prevDevices.find((d) => d.host === service.host)) {
          return prevDevices;
        }

        return [...prevDevices, service];
      });
    });

    return () => {
      browser.stop();
      bonjour.destroy();
    };
  }, [opts]);

  return devices;
}
