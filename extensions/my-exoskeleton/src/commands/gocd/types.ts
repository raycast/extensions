export interface GoCDPreference {
  GocdPAT: string
  GoCDBaseUrl: string
}

export interface GocdPipelineStatus {
  paused: boolean
  paused_cause: string | undefined
  paused_by: string
  locked: boolean
  schedulable: boolean
}

export type StageStatus = 'Building' | 'Passed' | 'Failed' | 'Cancelled' | 'Unknown'

export interface PipelineStage {
  name: string
  status: StageStatus
}

export interface GocdPipelineInstance {
  name: string
  counter: number
  label: string
  scheduled_date: number
  build_cause: {
    trigger_message: string
  }
  stages: Array<{
    name: string
    status: StageStatus
  }>
}

export interface GocdPipelineHistory {
  pipelines: Array<GocdPipelineInstance>
}

export interface GocdPipeline {
  name: string
  last_updated_timestamp: number

  _embedded: {
    instances: [
      {
        label: string
        counter: number
        triggered_by: string
        scheduled_at: string
        _embedded: {
          stages: PipelineStage[]
        }
      }
    ]
  }
}

export interface GocdBoard {
  _embedded: {
    pipeline_groups: Array<{
      name: string
      pipelines: string[]
    }>
    pipelines: Array<GocdPipeline>
  }
}
