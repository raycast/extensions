import { openDirectory } from "./lib/otty";

export default async function Command(props: {
  arguments: Arguments.OpenDirectory;
}) {
  await openDirectory(props.arguments.directory);
}
