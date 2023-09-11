import { Color, Icon } from '@raycast/api'
import { Function } from '@scaleway/sdk'

export const FUNCTIONS_STATUSES = Function.v1beta1.FUNCTION_TRANSIENT_STATUSES.reduce(
  (acc, transientStatus) => ({
    ...acc,
    [transientStatus]: {
      ...acc[transientStatus],
      source: Icon.CircleProgress100,
      tintColor: Color.Blue,
    },
  }),
  {
    unknown: { source: Icon.QuestionMarkCircle, tintColor: Color.Purple },
    creating: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    created: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    ready: { source: Icon.CircleFilled, tintColor: Color.Green },
    deleting: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    error: { source: Icon.CircleFilled, tintColor: Color.Red },
    locked: { source: Icon.Lock, tintColor: Color.Red },
    pending: { source: Icon.CircleProgress100, tintColor: Color.Blue },
  }
)

export const getFunctionStatusIcon = (serverlessfunction: Function.v1beta1.Function) =>
  FUNCTIONS_STATUSES[serverlessfunction.status]

export const isFunctionTransient = (serverlessfunction?: Function.v1beta1.Function) =>
  serverlessfunction
    ? Function.v1beta1.FUNCTION_TRANSIENT_STATUSES.includes(serverlessfunction.status)
    : false
