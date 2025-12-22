import { LaunchProps } from "@raycast/api";

export default async function (props: LaunchProps<{ arguments: { stopId: string } }>) {
  const { stopId } = props.arguments;
  console.log(stopId);
}
