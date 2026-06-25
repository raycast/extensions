import { openSshTarget } from "./lib/otty";

type Arguments = {
  target: string;
};

export default async function Command(props: { arguments: Arguments }) {
  await openSshTarget(props.arguments.target);
}
