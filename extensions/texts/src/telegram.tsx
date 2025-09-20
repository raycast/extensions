import { LaunchProps, open } from "@raycast/api";

export default async function Main(props: LaunchProps<{ arguments: Arguments.Telegram }>) {
  const { username } = props.arguments;
  await open(`https://t.me/${username}`);
}
