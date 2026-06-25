import { openSshTarget } from "./lib/otty";

export default async function Command(props: { arguments: Arguments.Ssh }) {
  await openSshTarget(props.arguments.target);
}
