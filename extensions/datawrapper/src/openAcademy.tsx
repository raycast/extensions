import { open, LaunchProps } from "@raycast/api";

export default async function Command(props: LaunchProps<{ arguments: Arguments.OpenAcademy }>) {
  await open(
    `https://academy.datawrapper.de/${props.arguments.searchQuery ? `search?query=${props.arguments.searchQuery}` : ""}`,
  );
}
