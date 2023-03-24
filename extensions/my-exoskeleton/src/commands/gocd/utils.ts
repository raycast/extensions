import { PipelineStage } from './types'

export const getBearerTokenHeader = (token: string) => ({ Authorization: `Bearer ${token}` })

export const calculateStatus = (stages: Array<PipelineStage>) => {
  if (!stages) {
    return 'Unknown'
  }
  const stage = stages.find((s) => s.status != 'Passed' && s.status != 'Unknown')
  return stage?.status || 'Passed'
}
