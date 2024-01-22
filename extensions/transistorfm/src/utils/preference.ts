import { getPreferenceValues as gp } from '@raycast/api';

import { Preference } from './types';

export function getPreferenceValues() {
  return gp<Preference>();
}
