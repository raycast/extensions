import { Detail, ActionPanel, Action } from "@raycast/api";
import obliqueStrategies from "./oblique-strategies.json";
import { useEffect, useState } from "react";
import type { ObliqueStrategy } from "./types";

function getRandomObliqueStrategy(): ObliqueStrategy {
  return obliqueStrategies[Math.floor(Math.random() * obliqueStrategies.length)];
}

export default function Command() {
  const [obliqueStrategy, setObliqueStrategy] = useState(getRandomObliqueStrategy());

  useEffect(() => {
    setObliqueStrategy(getRandomObliqueStrategy());
  }, []);

  return (
    <Detail
      markdown={`| ${obliqueStrategy.strategy} |
| - |
      `}
      navigationTitle="Oblique Strategies"
      actions={
        <ActionPanel>
          <Action title="New Strategy" onAction={() => setObliqueStrategy(getRandomObliqueStrategy())} />
          <Action.CopyToClipboard content={obliqueStrategy.strategy} shortcut={{ modifiers: ["cmd"], key: "c" }} />
          <Action.Paste content={obliqueStrategy.strategy} shortcut={{ modifiers: ["cmd"], key: "v" }} />
        </ActionPanel>
      }
    />
  );
}
