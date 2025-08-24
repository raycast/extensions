import { LaunchProps } from '@raycast/api';

export function useLaunchContext<T>() {
  return (props: LaunchProps) => props.launchContext as T;
}
