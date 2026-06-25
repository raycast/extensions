import { openDirectory } from "./lib/otty";

type Arguments = {
  directory: string;
};

export default async function Command(props: { arguments: Arguments }) {
  await openDirectory(props.arguments.directory);
}
