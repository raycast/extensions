import { showToast } from "@raycast/api";
import { SetStateAction } from "react";
import { ApiResponse } from "../types/apiResponse";
import { FormValues } from "../types/formValues";

export async function resetForm(
  reset: (values?: Partial<FormValues>) => void,
  focus: (id: keyof FormValues) => void,
  setMockData: (data: ApiResponse[]) => void,
  setValue: (id: keyof FormValues, value: SetStateAction<FormValues[keyof FormValues]>) => void
) {
  reset();
  focus("input");
  await setTimeout(async () => {
    setMockData([]);
    setValue("input", "");
    setValue("rows", "");
    await showToast({ title: "Form reset", message: "The generator is ready for work!" });
  }, 200);
}
