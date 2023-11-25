import { Color, Icon } from '@raycast/api'
import type { Secret } from '@scaleway/sdk'

export const VERSION_STATUSES: Record<
  Secret.v1alpha1.SecretVersionStatus,
  { source: Icon; tintColor: Color }
> = {
  destroyed: { source: Icon.Lock, tintColor: Color.Red },
  disabled: { source: Icon.Lock, tintColor: Color.Orange },
  enabled: { source: Icon.CircleFilled, tintColor: Color.Green },
  unknown: { source: Icon.QuestionMarkCircle, tintColor: Color.Purple },
}

export const getVersionStatusIcon = (version: Secret.v1alpha1.SecretVersion) =>
  VERSION_STATUSES[version.status]
