import { GenerationDetails } from "./components/GenerationDetails";
import { GenerationContextProvider } from "./contexts/GenerationContext";
import { SelectedGenerationContextProvider } from "./contexts/SelectedGenerationContext";

export function Details({ selectedId }: { selectedId: string }) {
  return (
    <GenerationContextProvider>
      <SelectedGenerationContextProvider selectedId={selectedId}>
        <GenerationDetails />
      </SelectedGenerationContextProvider>
    </GenerationContextProvider>
  );
}
