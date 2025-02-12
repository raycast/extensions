import { moveTo } from "./common";

export default async function moveToCustom(props: { arguments: Arguments.MoveToCustom }) {
  const height = +props.arguments.height;
  await moveTo(height * 10);
}
