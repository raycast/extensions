import { connectCurrent } from "./lib/actions";

export default async function Command() {
  await connectCurrent();
}
