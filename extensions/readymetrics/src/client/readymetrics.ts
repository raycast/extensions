import { getPreferenceValues, Toast } from "@raycast/api";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

export interface Checkin {
  id: string;
  checkinType: string;
  checkinEmployeeName: string;
  checkinEmployeePicture: string;
  scheduledFor: number;
  color: string;
  icon: string;
}

const { token } = getPreferenceValues();

const api = axios.create({
  baseURL: "https://api.ready.app/integrations",
  headers: { Authorization: `Bearer ${token}` },
});

async function rmAPI<T>({ method = "GET", ...props }: AxiosRequestConfig) {
  const resp = api.request<ReadymetricsCheckinResponse, T>({ method, ...props });
  return resp;
}

export interface ReadymetricsCheckinResponse extends AxiosResponse {
  data: Checkin[];
}

export async function requestUpcomingCheckins(): Promise<Checkin[]> {
  const response = <ReadymetricsCheckinResponse>await rmAPI<ReadymetricsCheckinResponse>({ url: "/checkins/upcoming" });
  return response.data;
}

export async function requestPastCheckins(): Promise<Checkin[]> {
  const response = <ReadymetricsCheckinResponse>await rmAPI<ReadymetricsCheckinResponse>({ url: "/checkins/past" });
  return response.data;
}
