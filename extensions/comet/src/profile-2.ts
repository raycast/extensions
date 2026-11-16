import { runSlot, SlotProps } from "./profile-slot";

export default async function Command(props: SlotProps) {
  await runSlot(props);
}
