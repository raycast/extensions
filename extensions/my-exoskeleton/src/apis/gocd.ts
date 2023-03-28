import { GOCDAcceptHeaders } from '../constants/gocd'
import { initHttpClient } from '../utils/httpClient'
import { getBearerTokenHeader } from '../utils/index'
import { DashboardResponse, HistoryResponse } from './types/gocd.type'

/*
  Reference to GoCD Document **https://api.gocd.org/current/**
*/

export const buildGoCDClient = (url: string, token: string) => {
  const httpClient = initHttpClient({
    baseURL: url + '/go/api',
    headers: getBearerTokenHeader(token)
  })

  function getDashboard() {
    return httpClient.get<DashboardResponse>('/dashboard', {
      headers: GOCDAcceptHeaders.v3
    })
  }

  function getPipelineHistory(pipelineName: string) {
    return httpClient.get<HistoryResponse>(`/pipelines/${pipelineName}/history`, {
      headers: GOCDAcceptHeaders.v1
    })
  }

  function runStage(name: string, counter: number, stage: string) {
    return httpClient.post(`/stages/${name}/${counter}/${stage}/run`, {
      headers: {
        'X-GoCD-Confirm': true,
        ...GOCDAcceptHeaders.v2
      }
    })
  }

  return { getDashboard, getPipelineHistory, runStage }
}

export type GoCDClient = ReturnType<typeof buildGoCDClient>
