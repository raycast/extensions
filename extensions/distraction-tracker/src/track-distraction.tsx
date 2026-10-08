import { showHUD, PopToRootType } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { randomUUID } from "crypto";
import { Distraction, DistractionFormValues } from "./lib/types";
import { feelings } from "./lib/feelings";
import { DistractionForm } from "./components/distraction-form";

export default function Command() {
  const { setValue: setDistractions, value: distractions } = useLocalStorage<Distraction[]>("distractions", []);

  return (
    <DistractionForm
      onSubmitHandler={async (values: DistractionFormValues) => {
        const previousDistractions = distractions ?? [];
        await setDistractions([
          ...previousDistractions,
          {
            ...values,
            feeling: values.feeling as keyof typeof feelings,
            id: randomUUID(),
            time: values.time ?? new Date(),
          },
        ]);
        showHUD("Distraction saved", { clearRootSearch: true, popToRootType: PopToRootType.Immediate });
        return;
      }}
    />
  );
}
