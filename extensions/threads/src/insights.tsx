import { LaunchProps, closeMainWindow, open } from '@raycast/api';

export default async function Command(props: LaunchProps<{ arguments: Arguments.Insights }>) {
  const url = 'https://www.threads.net/insights';
  const params = new URLSearchParams();
  const { period } = props.arguments;
  if (period) params.append('days', period);
  await closeMainWindow();
  open(url + '?' + params.toString());
}
