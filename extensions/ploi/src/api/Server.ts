import {
  clearLocalStorage,
  showToast,
  ToastStyle,
  popToRoot,
} from "@raycast/api";
import { IServer } from "../Server";
import { camelCase, mapKeys, sortBy } from "lodash";
import { PLOI_API_URL } from "../config";
import axios, { AxiosError } from "axios";

export const Server = {
  async getAll() {
    const servers = await getServers();

    return sortBy(servers, (s) => s.name.toLowerCase()) ?? {};
  },

  async reboot({
    serverId,
    label = "server",
  }: {
    serverId: number | string;
    key?: string;
    label?: string;
  }) {
    try {
      await axios.post(`${PLOI_API_URL}/servers/${serverId}/restart`);
      await showToast(ToastStyle.Success, `Rebooting ${label}...`);
    } catch (error) {
      console.error(error);
      await showToast(ToastStyle.Failure, `Failed to reboot ${label}`);
      return;
    }
  },

  async restartService({
    serverId,
    service,
    label,
  }: {
    serverId: number | string;
    service: string;
    label: string;
  }) {
    try {
      await axios.post(
        `${PLOI_API_URL}/servers/${serverId}/services/${service}/restart`
      );
      await showToast(ToastStyle.Success, `Restarting ${label}...`);
    } catch (error) {
      console.error(error);
      await showToast(ToastStyle.Failure, `Failed to restart ${label}`);
      return;
    }
  },

  async refreshOpCache({ serverId }: { serverId: number | string }) {
    try {
      await axios.post(`${PLOI_API_URL}/servers/${serverId}/refresh-opcache`);
      await showToast(ToastStyle.Success, `Refreshing OPcache...`);
    } catch (error) {
      const axiosError = (error as AxiosError).response;

      if (
        axiosError &&
        axiosError.status === 422 &&
        axiosError.data &&
        axiosError.data.errors[0]
      ) {
        await showToast(ToastStyle.Failure, "Error", axiosError.data.errors[0]);
        return;
      }

      await showToast(ToastStyle.Failure, `Failed to refresh OPcache`);
      return;
    }
  },
};

const getServers = async () => {
  try {
    const response = await axios.get(`${PLOI_API_URL}/servers`);

    const serverData = (await response.data) as ServersResponse;
    const servers = serverData?.data ?? [];

    // eslint-disable-next-line
    // @ts-expect-error Not sure how to convert Dictionary from lodash to IServer
    return servers.map((s) => mapKeys(s, (_, k) => camelCase(k)) as IServer);
  } catch (error) {
    const axiosError = (error as AxiosError).response;

    if (axiosError?.status === 401 && axiosError?.data) {
      // Show something is wrong
      await showToast(
        ToastStyle.Failure,
        "Wrong API key used",
        "Please remove your API key in the preferences window, and enter a valid one"
      );

      // Clear anything we have
      await clearLocalStorage();

      // Pop to the main window
      await popToRoot();

      return;
    }
  }
};

type ServersResponse = {
  data: IServer[];
};
