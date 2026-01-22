import axios, { AxiosInstance } from "axios";
import { getPreferenceValues } from "@raycast/api";
import { Preferences, CreateTicketPayload } from "./types";

const getClient = (): AxiosInstance => {
  const { domain, apiKey } = getPreferenceValues<Preferences>();

  // Ensure domain doesn't have protocol
  const distinctDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return axios.create({
    baseURL: `https://${distinctDomain}/api/v2`,
    auth: {
      username: apiKey,
      password: "X", // Freshservice requires 'X' as password usually, or just api key as username
    },
    headers: {
      "Content-Type": "application/json",
    },
  });
};

export const getAPIDetails = () => {
  const { domain, apiKey } = getPreferenceValues<Preferences>();
  const distinctDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const encoded = Buffer.from(`${apiKey}:X`).toString("base64");
  return {
    domain: distinctDomain,
    baseUrl: `https://${distinctDomain}/api/v2`,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${encoded}`,
    },
  };
};

export const createTicket = async (data: CreateTicketPayload) => {
  const client = getClient();
  const response = await client.post("/tickets", data);
  return response.data;
};

export const getTickets = async (params: Record<string, unknown> = {}) => {
  const client = getClient();
  const response = await client.get("/tickets", { params });
  return response.data;
};

export const getTicket = async (id: number) => {
  const client = getClient();
  const response = await client.get(`/tickets/${id}`);
  return response.data;
};

export const createNote = async (
  ticketId: number,
  body: string,
  isPrivate: boolean,
) => {
  const client = getClient();
  const response = await client.post(`/tickets/${ticketId}/notes`, {
    body,
    private: isPrivate,
  });
  return response.data;
};

export const updateTicket = async (
  id: number,
  data: Record<string, unknown>,
) => {
  const client = getClient();
  const response = await client.put(`/tickets/${id}`, data);
  return response.data;
};

export const getTasks = async (ticketId: number) => {
  const client = getClient();
  const response = await client.get(`/tickets/${ticketId}/tasks`);
  return response.data;
};

export const createTask = async (
  ticketId: number,
  data: Record<string, unknown>,
) => {
  const client = getClient();
  const response = await client.post(`/tickets/${ticketId}/tasks`, data);
  return response.data;
};

export const updateTask = async (
  ticketId: number,
  taskId: number,
  data: Record<string, unknown>,
) => {
  const client = getClient();
  const response = await client.put(
    `/tickets/${ticketId}/tasks/${taskId}`,
    data,
  );
  return response.data;
};

export const getAgentMe = async () => {
  const client = getClient();
  const response = await client.get("/agents/me");
  return response.data;
};
