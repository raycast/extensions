import { showToast, Toast } from "@raycast/api";
import { BabyBuddyAPI } from "../api";
import { getDiaperDescription } from "../utils";

export default async function ({
  childName,
  wet = false,
  solid = false,
  color = "",
  amount = "",
  notes = "",
  time = new Date().toISOString(),
}: {
  childName: string;
  wet?: boolean;
  solid?: boolean;
  color?: string;
  amount?: string;
  notes?: string;
  time?: string;
}) {
  const api = new BabyBuddyAPI();
  const children = await api.getChildren();

  // More flexible child name matching
  const child = children.find(
    (c) =>
      c.first_name.toLowerCase() === childName.toLowerCase() ||
      c.first_name.toLowerCase().includes(childName.toLowerCase()) ||
      `${c.first_name} ${c.last_name}`.toLowerCase() === childName.toLowerCase() ||
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(childName.toLowerCase()),
  );

  if (!child) {
    throw new Error(`Child with name ${childName} not found`);
  }

  // Validate that at least one of wet or solid is true
  if (!wet && !solid) {
    throw new Error("At least one of wet or solid must be true");
  }

  // Convert amount to number or null
  const numericAmount = amount ? parseFloat(amount) : null;

  // Create the diaper change
  const diaperData = {
    child: child.id,
    time,
    wet,
    solid,
    color: solid ? color : "",
    amount: numericAmount,
    notes,
  };

  const newDiaper = await api.createDiaper(diaperData);

  await showToast({
    style: Toast.Style.Success,
    title: "Diaper Change Created",
    message: `Recorded ${getDiaperDescription(wet, solid)} diaper for ${child.first_name}`,
  });

  return newDiaper;
}
