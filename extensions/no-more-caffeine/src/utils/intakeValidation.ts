import { showToast, Toast } from "@raycast/api";
import { positiveAmount } from "./intakeData";

function parseAndValidateIntake(caffeineAmount: string, chosenTime: Date): number | null {
  const caffeineMg = positiveAmount(caffeineAmount);
  if (caffeineMg === undefined) {
    showToast({
      style: Toast.Style.Failure,
      title: "Invalid caffeine amount",
      message: "Please enter a valid positive number",
    });
    return null;
  }

  if (!Number.isFinite(+chosenTime) || chosenTime > new Date()) {
    showToast({
      style: Toast.Style.Failure,
      title: "Invalid time",
      message: "Intake time cannot be in the future",
    });
    return null;
  }

  return caffeineMg;
}

export function parseIntakeFromForm(
  caffeineAmount: string,
  intakeTime: Date | null,
  defaultTime: Date,
): { caffeineMg: number; chosenTime: Date } | null {
  const chosenTime = intakeTime ?? defaultTime;
  const caffeineMg = parseAndValidateIntake(caffeineAmount, chosenTime);
  if (caffeineMg === null) {
    return null;
  }

  return { caffeineMg, chosenTime };
}
