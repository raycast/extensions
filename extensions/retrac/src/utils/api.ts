import axios from "axios";
// import { apiKey } from "../hooks/hooks";
// import { Item } from "../types/types";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { BASE_API_URL } from "./constants";
import { apiKey, projectSlug } from "./env";
import { DomainResponse } from "./types";

export const useCreateItem = () => {
  return useMutation({
    mutationFn: async ({
      sku,
      description,
      quantity,
      cost,
    }: {
      sku: string;
      description?: string;
      quantity?: number;
      cost?: number;
    }) => {
      const response = await createItem(sku, description, quantity, cost);
      return response.data;
    },
  });
};

export const useGetAllItems = () => {
  return useQuery({
    queryKey: ["allItems"],
    queryFn: async () => {
      const allItems = await getAllItems();
      return allItems.data as DomainResponse[];
    },
  });
};

export const useDeleteItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => {
      const response = await deleteItem(itemId);
      return response.data as DomainResponse;
    },
    onSuccess: () => queryClient.invalidateQueries("allItems"),
  });
};

const createItem = async (sku: string, description?: string, quantity?: number, cost?: number) => {
  return axios({
    method: "POST",
    url: `${BASE_API_URL}?projectSlug=${projectSlug}`,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    data: {
      sku,
      description,
      quantity,
      cost,
    },
  });
};
const getAllItems = async () => {
  return axios({
    method: "GET",
    url: `${BASE_API_URL}?projectSlug=${projectSlug}`,
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
    },
  });
};

const deleteItem = async (itemId: string) => {
  return axios({
    method: "DELETE",
    url: `${BASE_API_URL}/${itemId}?projectSlug=${projectSlug}`,
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
    },
  });
};
