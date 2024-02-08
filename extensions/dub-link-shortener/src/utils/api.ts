import axios from "axios";
// import { apiKey } from "../hooks/hooks";
// import { ShortLink } from "../types/types";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { BASE_API_URL } from "./constants";
import { apiKey, projectDomain, projectSlug } from "./env";
import { DomainResponse } from "./types";
function hasHttps(url: string) {
  return url.startsWith("https://");
}

export const useCreateShortLink = () => {
  return useMutation({
    mutationFn: async ({ originalUrl, urlKey }: { originalUrl: string; urlKey?: string }) => {
      const response = await createShortLink(originalUrl, urlKey);
      return response.data as DomainResponse;
    },
  });
};

export const useGetAllShortLinks = () => {
  return useQuery({
    queryKey: ["allShortLinks"],
    queryFn: async () => {
      const allShortLinks = await getAllShortLinks();
      return allShortLinks.data as DomainResponse[];
    },
  });
};

export const useDeleteShortLink = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (linkId: string) => {
      const response = await deleteShortLink(linkId);
      return response.data as DomainResponse;
    },
    onSuccess: () => queryClient.invalidateQueries("allShortLinks"),
  });
};

const createShortLink = async (originalURL: string, urlKey?: string) => {
  const urlToShorten = hasHttps(originalURL) ? originalURL : `https://${originalURL}`;

  return axios({
    method: "POST",
    url: `${BASE_API_URL}?projectSlug=${projectSlug}`,
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
    },
    data: {
      domain: projectDomain,
      url: urlToShorten,
      key: urlKey,
    },
  });
};

const getAllShortLinks = async () => {
  return axios({
    method: "GET",
    url: `${BASE_API_URL}?projectSlug=${projectSlug}`,
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
    },
  });
};

const deleteShortLink = async (linkId: string) => {
  return axios({
    method: "DELETE",
    url: `${BASE_API_URL}/${linkId}?projectSlug=${projectSlug}`,
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
    },
  });
};
