import { LaunchProps } from "@raycast/api";
import { useEffect, useState } from "react";
import { ErrorPanel } from "./components/ErrorPanel";
import { GenerationDetails } from "./components/GenerationDetails";
import { GenerationContextProvider, useGenerationContext } from "./contexts/GenerationContext";
import { SelectedGenerationContextProvider } from "./contexts/SelectedGenerationContext";

export default function Imagine(props: LaunchProps<{ arguments: { prompt: string } }>) {
  const { prompt } = props.arguments;
  return (
    <GenerationContextProvider>
      <ImagineContent prompt={prompt} />
    </GenerationContextProvider>
  );
}

function ImagineContent({ prompt }: { prompt: string }) {
  const [generationId, setGenerationId] = useState<string | undefined>();
  const { createGeneration } = useGenerationContext();
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    createGeneration(prompt, (gen) => {
      setGenerationId(gen.guid);
    }).then(({ success }) => {
      setIsError(!success);
    });
  }, []);

  if (isError) {
    return <ErrorPanel />;
  }

  if (!generationId) return null;
  return (
    <SelectedGenerationContextProvider selectedId={generationId}>
      <GenerationDetails />
    </SelectedGenerationContextProvider>
  );
}
