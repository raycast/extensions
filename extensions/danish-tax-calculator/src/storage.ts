import { LocalStorage } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

interface CalculationHistory {
  timestamp: number;
  income: number;
  tax: number;
  salary: number;
}

export async function saveCalculation(calculation: CalculationHistory) {
  const history = await getCalculationHistory();
  const updatedHistory = [calculation, ...history].slice(0, 10); // Keep last 10 calculations
  await LocalStorage.setItem("calculation-history", JSON.stringify(updatedHistory));
}

export async function getCalculationHistory(): Promise<CalculationHistory[]> {
  try {
    const history = await LocalStorage.getItem("calculation-history");
    return typeof history === "string" ? JSON.parse(history) : [];
  } catch (error) {
    showFailureToast(error, { title: "Failed to parse calculation history" });
    return [];
  }
}

export async function deleteCalculation(timestamp: number) {
  const history = await getCalculationHistory();
  const updatedHistory = history.filter((calc) => calc.timestamp !== timestamp);
  await LocalStorage.setItem("calculation-history", JSON.stringify(updatedHistory));
}

export async function deleteAllCalculations() {
  await LocalStorage.removeItem("calculation-history");
}
