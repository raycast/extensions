import { showHUD, LaunchProps } from "@raycast/api";

export default async function main(props: LaunchProps<{ arguments: { title: string } }>) {
  const { title } = props.arguments;
  await showHUD(title);
}
