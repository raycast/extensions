import { Color, Icon } from '@raycast/api'
import type { Temv1alpha1 } from '@scaleway/sdk'

export const DOMAIN_TRANSIANT_STATE: Temv1alpha1.DomainStatus[] = ['pending']

export const DOMAIN_STATUSES = DOMAIN_TRANSIANT_STATE.reduce(
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
    checked: { source: Icon.CircleFilled, tintColor: Color.Green },
    unchecked: { source: Icon.CircleProgress100, tintColor: Color.Orange },
    invalid: { source: Icon.CircleProgress100, tintColor: Color.Orange },
    locked: { source: Icon.Lock, tintColor: Color.Red },
    revoked: { source: Icon.QuestionMarkCircle, tintColor: Color.Orange },
    autoconfiguring: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    pending: { source: Icon.CircleProgress100, tintColor: Color.Blue },
  }
)

export const getDomainStatusIcon = (domain: Temv1alpha1.Domain) => DOMAIN_STATUSES[domain.status]
