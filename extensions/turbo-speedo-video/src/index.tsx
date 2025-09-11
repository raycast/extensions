import { LaunchProps } from '@raycast/api';
import AdjustVideoSpeed from './adjust-video-speed';

export default function Command(props: LaunchProps) {
  return <AdjustVideoSpeed {...props} />;
}
