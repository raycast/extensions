import { showToast, Toast } from "@raycast/api";
import { ISite } from "../Site";
import { camelCase, mapKeys, sortBy } from "lodash";
import { IServer } from "../Server";
import { PLOI_API_URL, PLOI_PER_PAGE } from "../config";
import axios, { AxiosError } from "axios";
import { PaginatedResponse } from "../common/types";

export const Site = {
  async getAll(server: IServer) {
    try {
      const response = await axios.get(`${PLOI_API_URL}/servers/${server.id}/sites?per_page=${PLOI_PER_PAGE}`);
      const siteData = (await response.data) as Sites;
      let sites = siteData?.data ?? [];

      // eslint-disable-next-line
      // @ts-expect-error Not sure how to convert Dictionary from lodash to IServer
      sites = sites.map((s) => mapKeys(s, (_, k) => camelCase(k)) as ISite);
      return sortBy(sites, "domain") as ISite[];
    } catch (error: unknown) {
      await showToast(Toast.Style.Failure, (error as Error).message);
      return;
    }
  },

  async get(site: ISite, server: IServer) {
    try {
      const response = await axios.get(`${PLOI_API_URL}/servers/${server.id}/sites/${site.id}`);
      const siteData = (await response.data) as ISite;
      // eslint-disable-next-line
      // @ts-expect-error Not sure how to convert Dictionary from lodash to IServer
      return mapKeys(siteData?.data ?? [], (_, k) => camelCase(k)) as ISite;
    } catch (error: unknown) {
      await showToast(Toast.Style.Failure, (error as Error).message);
      return;
    }
  },

  async deploy(site: ISite, server: IServer) {
    try {
      await axios.post(`${PLOI_API_URL}/servers/${server.id}/sites/${site.id}/deploy`);
      await showToast(Toast.Style.Success, `Deploying ${site.domain}`);
    } catch (error) {
      const axiosError = (error as AxiosError).response;

      if (axiosError && axiosError.status === 422 && axiosError.data && axiosError.data.error) {
        await showToast(Toast.Style.Failure, "Error", axiosError.data.error);
        return;
      }

      await showToast(Toast.Style.Failure, (error as Error).message);
      return;
    }
  },

  async flushFastCgiCache(site: ISite, server: IServer) {
    try {
      await axios.post(`${PLOI_API_URL}/servers/${server.id}/sites/${site.id}/fastcgi-cache/flush`);
      await showToast(Toast.Style.Success, `Flushing FastCGI Cache`);
    } catch (error) {
      const axiosError = (error as AxiosError).response;

      if (axiosError?.status === 422 && axiosError?.data && axiosError?.data.errors[0]) {
        await showToast(Toast.Style.Failure, "Error", axiosError?.data.errors[0]);
        return;
      }

      await showToast(Toast.Style.Failure, (error as Error).message);
      return;
    }
  },
};

type Sites = PaginatedResponse<ISite>;
