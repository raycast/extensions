import { Color, Icon } from '@raycast/api'
import type { Secretv1beta1 } from '@scaleway/sdk'

export const VERSION_STATUSES: Record<
  Secretv1beta1.SecretVersionStatus,
  { source: Icon; tintColor: Color }
> = {
  deleted: { source: Icon.Lock, tintColor: Color.Red },
  disabled: { source: Icon.Lock, tintColor: Color.Orange },
  enabled: { source: Icon.CircleFilled, tintColor: Color.Green },
  scheduled_for_deletion: { source: Icon.Lock, tintColor: Color.Orange },
  unknown_status: { source: Icon.QuestionMarkCircle, tintColor: Color.Purple },
}

export const getVersionStatusIcon = (version: Secretv1beta1.SecretVersion) =>
  VERSION_STATUSES[version.status]
