import { StageStatus } from '../../constants/gocd'

export interface Link {
  href: string
}

export interface DashboardLinks {
  self: Link
  doc: Link
}

export interface PipelineGroup {
  _links: DashboardLinks
  name: string
  pipelines: string[]
  can_administer: boolean
}

export interface Environment {
  _links: DashboardLinks
  name: string
  pipelines: string[]
  can_administer: boolean
}

export interface PauseInfo {
  paused: boolean
  paused_by?: string
  pause_reason?: string
}

export interface Stage {
  _links: DashboardLinks
  name: string
  counter: string
  status: StageStatus
  approved_by: string
  scheduled_at: Date
}

export interface Embedded3 {
  stages: Stage[]
}

export interface Instance {
  _links: DashboardLinks
  label: string
  counter: number
  triggered_by: string
  scheduled_at: Date
  _embedded: Embedded3
}

export interface Embedded2 {
  instances: Instance[]
}

export interface Pipeline {
  _links: DashboardLinks
  name: string
  last_updated_timestamp: number
  locked: boolean
  pause_info: PauseInfo
  can_operate: boolean
  can_administer: boolean
  can_unlock: boolean
  can_pause: boolean
  from_config_repo: boolean
  _embedded: Embedded2
  timestamp?: number
}

export interface Embedded {
  pipeline_groups: PipelineGroup[]
  environments: Environment[]
  pipelines: Pipeline[]
}

export interface DashboardResponse {
  _links: DashboardLinks
  _personalization: string
  _embedded: Embedded
}

export interface HistoryLinks {
  next: Link
  previous: Link
}

export interface Material {
  name: string
  fingerprint: string
  type: string
  description: string
}

export interface Modification {
  revision: string
  modified_time: number
  user_name: string
  comment: string
  email_address?: any
}

export interface MaterialRevision {
  changed: boolean
  material: Material
  modifications: Modification[]
}

export interface BuildCause {
  trigger_message: string
  trigger_forced: boolean
  approver: string
  material_revisions: MaterialRevision[]
}

export interface Job {
  name: string
  scheduled_date: number
  state: string
  result: string
}

export interface Stage {
  result: string
  status: StageStatus
  rerun_of_counter?: any
  name: string
  counter: string
  scheduled: boolean
  approval_type: string
  approved_by: string
  operate_permission: boolean
  can_run: boolean
  jobs: Job[]
}

export interface Pipeline {
  name: string
  counter: number
  label: string
  natural_order: number
  can_run: boolean
  preparing_to_schedule: boolean
  comment?: string
  scheduled_date: number
  build_cause: BuildCause
  stages: Stage[]
}

export interface HistoryResponse {
  _links: HistoryLinks
  pipelines: Pipeline[]
}
