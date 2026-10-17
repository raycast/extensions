import { runSlot, SlotProps } from "./slot";

export default async function Command(props: SlotProps) {
  await runSlot(props);
}
