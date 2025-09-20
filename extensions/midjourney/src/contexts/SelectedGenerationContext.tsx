import { createContext, useContext } from "react";
import { Generation } from "../types";
import { useGenerationContext } from "./GenerationContext";

export interface GenerationContextType {
  selectedId: string;
}

const SelectedContext = createContext({} as { selectedGeneration: Generation });

export function useSelectedGenerationContext() {
  return useContext(SelectedContext);
}

export function SelectedGenerationContextProvider({
  children,
  selectedId,
}: GenerationContextType & { children: React.ReactNode }) {
  const { generations } = useGenerationContext();
  const selectedGeneration = generations.find((gen) => gen.guid === selectedId);

  if (!selectedGeneration) return null; // todo: error handling
  return (
    <SelectedContext.Provider
      value={{
        selectedGeneration,
      }}
    >
      {children}
    </SelectedContext.Provider>
  );
}
