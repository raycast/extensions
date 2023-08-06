import { LaunchProps } from "@raycast/api";
import Wrapper from "./wrapper";

interface Props {
  phone: string;
}

const Telegram = (props: LaunchProps<{ arguments: Props }>) => {
  const { phone } = props.arguments;

  return <Wrapper provider="WeChat" variable={phone} />;
};

export default Telegram;
