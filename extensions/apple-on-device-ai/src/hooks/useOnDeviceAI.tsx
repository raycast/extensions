import { getSelectedText } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { runModel } from "swift:../../swift";

export default function useOnDeviceAI(prompt: (selection: string) => string) {
  return usePromise(async () => {
    const selection = await getSelectedText();
    return await runModel(prompt(selection));
  });
}
