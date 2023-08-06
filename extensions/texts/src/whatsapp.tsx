import { LaunchProps } from "@raycast/api";
import Wrapper from "./wrapper";

interface Props {
  phone: string;
}

const WhatsApp = (props: LaunchProps<{ arguments: Props }>) => {
  const { phone } = props.arguments;

  return <Wrapper provider="WhatsApp" variable={phone} />;
};

export default WhatsApp;
