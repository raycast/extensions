import { LaunchProps } from "@raycast/api";
import Wrapper from "./wrapper";

interface Props {
  username: string;
}

const Telegram = (props: LaunchProps<{ arguments: Props }>) => {
  const { username } = props.arguments;

  return <Wrapper provider="Telegram" variable={username} />;
};

export default Telegram;
