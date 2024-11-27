import axiosClient from "./axios";
import { FiltersItem, ListFiltersResponse } from "../interfaces/nativeFilter";
import { ListThirdPartyFiltersResponse, FiltersItem as ThirdPartyFiltersItem } from "../interfaces/thirdPartyFilter";
export const listNativeFilters = async (profileId: string): Promise<FiltersItem[]> => {
  const res = await axiosClient.get(`/profiles/${profileId}/filters`);

  const data: ListFiltersResponse = res.data;

  if (!data.success) {
    throw new Error(`Failed to fetch native filters.`);
  }

  return data.body.filters;
};

export const listThirdPartyFilters = async (profileId: string): Promise<ThirdPartyFiltersItem[]> => {
  const res = await axiosClient.get(`/profiles/${profileId}/filters/external`);

  const data: ListThirdPartyFiltersResponse = res.data;

  if (!data.success) {
    throw new Error(`Failed to fetch third party filters.`);
  }

  return data.body.filters;
};
