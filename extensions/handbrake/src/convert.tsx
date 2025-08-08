import { useState, useEffect } from "react";
import { Detail, getSelectedFinderItems } from "@raycast/api";
import { findHandBrakeCLIPath } from "./handBrake/handBrakeCLI";
import { ConverterForm } from "./components/ConverterForm";

export default function Command() {
  const [initialFinderFiles, setInitialFinderFiles] = useState<string[]>([]);
  const [handBrakeCLIPath, setHandBrakeCLIPath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        const cliPath = await findHandBrakeCLIPath();
        setHandBrakeCLIPath(cliPath);

        if (cliPath) {
          try {
            const finderItems = await getSelectedFinderItems();
            setInitialFinderFiles(finderItems.map((item) => item.path));
          } catch (finderError) {
            console.warn("Could not get selected Finder items:", finderError);
            setInitialFinderFiles([]);
          }
        }
      } catch (error) {
        console.warn("Could not get HandBrakeCLI path:", error);
        setHandBrakeCLIPath(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return isLoading ? (
    <Detail isLoading={true} />
  ) : handBrakeCLIPath ? (
    <ConverterForm initialFiles={initialFinderFiles} />
  ) : (
    <Detail
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Link title="Github" target="https://github.com/marcopelegrini" text="marcopelegrini" />
          <Detail.Metadata.Link title="download" target="https://handbrake.fr/downloads2.php" text="HandBrake CLI" />
        </Detail.Metadata>
      }
      markdown={`
## 🍍 HandBrake for Raycast

Requirements:

- Please install handbrake: 

      brew install handbrake
`}
    />
  );
}
