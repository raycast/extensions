import { useEffect, useState } from "react";
import {
  type Device,
  type StatusResponse,
  getStatus,
  getDevices,
  getErrorDetails,
  sortDevices,
  type ErrorDetails,
} from "../shared";

type UseDeviceListOptions = {
  filter?: (device: Device, status: StatusResponse) => boolean;
  errorMessage?: string;
};

export function useDeviceList(options: UseDeviceListOptions = {}) {
  const { filter, errorMessage = "Couldn't load device list." } = options;
  const [devices, setDevices] = useState<Device[]>();
  const [error, setError] = useState<ErrorDetails>();

  useEffect(() => {
    async function fetch() {
      try {
        const status = getStatus();
        let list = getDevices(status);
        if (filter) {
          list = list.filter((device) => filter(device, status));
        }
        sortDevices(list);
        setDevices(list);
      } catch (err) {
        setError(getErrorDetails(err, errorMessage));
      }
    }
    fetch();
  }, [filter, errorMessage]);

  return { devices, error, isLoading: !devices && !error };
}
