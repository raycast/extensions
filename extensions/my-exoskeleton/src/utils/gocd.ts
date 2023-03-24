import { Color, Icon } from '@raycast/api'
import { StageStatus } from '../constants/gocd'

export function getStageIconByStatus(status: StageStatus) {
  if (status === StageStatus.Passed) {
    return { source: Icon.CheckCircle, tintColor: Color.Green }
  }
  if (status === StageStatus.Failed) {
    return { source: Icon.XMarkCircle, tintColor: Color.Red }
  }
  if (status === StageStatus.Cancelled) {
    return { source: Icon.MinusCircle, tintColor: Color.Yellow }
  }
  if (status === StageStatus.Building) {
    return { source: Icon.CircleProgress, tintColor: Color.Yellow }
  }
  return { source: Icon.QuestionMarkCircle, tintColor: Color.SecondaryText }
}
