import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import { availablePets } from "./data/pets";
import { adoptPet } from "./utils";
import ViewPet from ".";
import { usePetState } from "./hooks/usePetState";
import { showFailureToast } from "@raycast/utils";

export default function AdoptPet() {
  const { petState, isLoading, setPetState } = usePetState();

  const handleAdopt = (petKey: string) => {
    const pet = availablePets.find((p) => p.key === petKey);
    if (pet) {
      const newPetState = adoptPet(pet);
      setPetState(newPetState);
    } else {
      showFailureToast("Pet not found");
    }
  };

  if (petState) {
    return <ViewPet />;
  }

  return (
    <Grid isLoading={isLoading} columns={5} fit={Grid.Fit.Contain} inset={Grid.Inset.Small}>
      {availablePets.map((pet) => (
        <Grid.Item
          key={pet.key}
          content={{ source: pet.sprite }}
          title={pet.type}
          actions={
            <ActionPanel>
              <Action title={`Adopt '${pet.type}'`} icon={Icon.Heart} onAction={() => handleAdopt(pet.key)} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
