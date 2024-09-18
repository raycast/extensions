import { LaunchProps, open } from "@raycast/api";

export default async function Main(props: LaunchProps<{ arguments: Arguments.Whatsapp }>) {
  const { phone } = props.arguments;
  await open(`https://api.whatsapp.com/send?phone=${phone}`);
}
