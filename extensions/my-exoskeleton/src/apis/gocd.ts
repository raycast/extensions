import { getPreferenceValues } from '@raycast/api'
import { GOCDAcceptHeaders } from '../constants/gocd'
import { initHttpClient } from '../utils/httpClient'
import { getBearerTokenHeader } from '../utils/index'
import { DashboardResponse, HistoryResponse } from './types/gocd.type'

/*
  Reference to GoCD Document **https://api.gocd.org/current/**
*/

const { GocdPAT, GoCDBaseUrl } = getPreferenceValues()
const httpClient = initHttpClient({
  baseURL: GoCDBaseUrl + '/go/api',
  headers: getBearerTokenHeader(GocdPAT)
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

export { getDashboard, getPipelineHistory, runStage }
