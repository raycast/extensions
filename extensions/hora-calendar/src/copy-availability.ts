import { copyAvailability } from "./actions";

export default async function Command(props: { arguments: Arguments.CopyAvailability }) {
  const { duration, days } = props.arguments;
  await copyAvailability(Number(duration) || 30, Number(days) || 5);
}
