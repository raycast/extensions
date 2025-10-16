import { Action, Icon } from '@raycast/api';

export function ToggleDetailsAction({
  showDetails,
  toggleDetails,
}: {
  showDetails: boolean;
  toggleDetails: () => void;
}) {
  return <Action icon={Icon.Eye} title={`${showDetails ? 'Hide' : 'Show'} Details`} onAction={() => toggleDetails()} />;
}
