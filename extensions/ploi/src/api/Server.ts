import { LocalStorage, showToast, Toast, popToRoot } from "@raycast/api";
import { IServer } from "../Server";
import { camelCase, mapKeys, sortBy } from "lodash";
import { PLOI_API_URL, PLOI_PER_PAGE } from "../config";
import axios, { AxiosError } from "axios";
import { PaginatedResponse } from "../common/types";

export const Server = {
  async getAll(page: number) {
    const response = await getServers(page);

    const sortedServers = sortBy(response?.data, (s) => s.name.toLowerCase()) ?? {};
    return {
      ...response,
      data: sortedServers,
    };
  },

  async reboot({ serverId, label = "server" }: { serverId: number | string; key?: string; label?: string }) {
    try {
      await axios.post(`${PLOI_API_URL}/servers/${serverId}/restart`);
      await showToast(Toast.Style.Success, `Rebooting ${label}...`);
    } catch (error) {
      console.error(error);
      await showToast(Toast.Style.Failure, `Failed to reboot ${label}`);
      return;
    }
  },

  async restartService({ serverId, service, label }: { serverId: number | string; service: string; label: string }) {
    try {
      await axios.post(`${PLOI_API_URL}/servers/${serverId}/services/${service}/restart`);
      await showToast(Toast.Style.Success, `Restarting ${label}...`);
    } catch (error) {
      console.error(error);
      await showToast(Toast.Style.Failure, `Failed to restart ${label}`);
      return;
    }
  },

  async refreshOpCache({ serverId }: { serverId: number | string }) {
    try {
      await axios.post(`${PLOI_API_URL}/servers/${serverId}/refresh-opcache`);
      await showToast(Toast.Style.Success, `Refreshing OPcache...`);
    } catch (error) {
      const axiosError = (error as AxiosError).response;

      if (axiosError && axiosError.status === 422 && axiosError.data && axiosError.data.errors[0]) {
        await showToast(Toast.Style.Failure, "Error", axiosError.data.errors[0]);
        return;
      }

      await showToast(Toast.Style.Failure, `Failed to refresh OPcache`);
      return;
    }
  },
};

const getServers = async (page: number) => {
  try {
    const response = await axios.get(`${PLOI_API_URL}/servers?per_page=${PLOI_PER_PAGE}&page=${page}`);

    const serverData = (await response.data) as ServersResponse;
    const servers = serverData?.data ?? [];

    // eslint-disable-next-line
    // @ts-expect-error Not sure how to convert Dictionary from lodash to IServer
    const mappedServers = servers.map((s) => mapKeys(s, (_, k) => camelCase(k)) as IServer);
    return {
      ...serverData,
      data: mappedServers,
    };
  } catch (error) {
    const axiosError = (error as AxiosError).response;

    if (axiosError?.status === 401 && axiosError?.data) {
      // Show something is wrong
      await showToast(
        Toast.Style.Failure,
        "Wrong API key used",
        "Please remove your API key in the preferences window, and enter a valid one",
      );

      // Clear anything we have
      await LocalStorage.clear();

      // Pop to the main window
      await popToRoot();

      return;
    }
  }
};

type ServersResponse = PaginatedResponse<IServer>;
