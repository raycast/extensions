import { Color, Icon } from '@raycast/api'
import { Domain } from '@scaleway/sdk'

export const DOMAIN_STATUSES = Domain.v2beta1.DOMAIN_TRANSIENT_STATUSES.reduce(
  (acc, transientStatus) => ({
    ...acc,
    [transientStatus]: {
      ...acc[transientStatus],
      source: Icon.CircleProgress100,
      tintColor: Color.Blue,
    },
  }),
  {
    active: { source: Icon.CircleFilled, tintColor: Color.Green },
    checking: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    create_error: { source: Icon.Lock, tintColor: Color.Red },
    creating: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    deleting: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    expired: { source: Icon.Lock, tintColor: Color.Red },
    expiring: { source: Icon.Lock, tintColor: Color.Red },
    locked: { source: Icon.Lock, tintColor: Color.Red },
    renew_error: { source: Icon.Lock, tintColor: Color.Red },
    renewing: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    status_unknown: { source: Icon.QuestionMarkCircle, tintColor: Color.Purple },
    updating: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    xfer_error: { source: Icon.Lock, tintColor: Color.Red },
    xfering: { source: Icon.CircleProgress100, tintColor: Color.Blue },
  }
)

export const getDomainStatusIcon = (domain: Domain.v2beta1.DomainSummary) =>
  DOMAIN_STATUSES[domain.status]
