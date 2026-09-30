import { showToast, Toast } from "@raycast/api";
import { FormValues } from "../types/formValues";
import { ApiResponse } from "../types/apiResponse";
import { postInterfacesToGenerate } from "../http/postInterfacesToGenerate";
import Style = Toast.Style;

export async function submitForm(
  values: FormValues,
  setMockData: (mockData: ApiResponse[]) => void,
  setIsLoading: (isLoading: boolean) => void
) {
  try {
    const generatedMockData = await postInterfacesToGenerate(
      JSON.stringify({
        scale: values.rows,
        value: values.input,
        numberMax: 1500,
      }),
      setIsLoading
    );

    setMockData(generatedMockData);
    await showToast({ title: "Mock data generated", message: "Your mock data is ready to be copied!" });
  } catch (e) {
    await showToast({
      title: "Generation failed",
      message: "Are you using only interfaces? Check your input again please.",
      style: Style.Failure,
    });
  }
}
