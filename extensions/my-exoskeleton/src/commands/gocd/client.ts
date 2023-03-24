import { useFetch } from "@raycast/utils";
import { GocdBoard, GoCDPreference, GocdPipelineHistory, GocdPipelineStatus } from "./types";
import { GOCDAcceptHeaders } from "./constants";
import { getBearerTokenHeader } from "./utils";
import { getPreferenceValues } from "@raycast/api";

/*
Reference to GoCD Document **https://api.gocd.org/current/**
 */

const { GocdPAT, GoCDBaseUrl } = getPreferenceValues<GoCDPreference>();

const fetchDashboard = () => useFetch<GocdBoard>(`${GoCDBaseUrl}/go/api/dashboard`, {
  headers: { ...GOCDAcceptHeaders.v3, ...getBearerTokenHeader(GocdPAT) }
});

const fetchPipelineStatus = (pipelineName: string) => useFetch<GocdPipelineStatus>(`${GoCDBaseUrl}/go/api/pipelines/${pipelineName}/status`, {
  headers: { ...GOCDAcceptHeaders.v1, ...getBearerTokenHeader(GocdPAT) }
});

const fetchPipelineHistory = (pipelineName: string) => useFetch<GocdPipelineHistory>(`${GoCDBaseUrl}/go/api/pipelines/${pipelineName}/history`, {
  headers: { ...GOCDAcceptHeaders.v1, ...getBearerTokenHeader(GocdPAT) }
});

export const CDClient = {
  fetchDashboard,
  fetchPipelineStatus,
  fetchPipelineHistory
};
