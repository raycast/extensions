import { Detail } from "@raycast/api";

import type { Scenario } from "@/types";

export type ScenarioDebugProps = {
  scenario: Scenario;
};

const ScenarioDebug = ({ scenario }: ScenarioDebugProps) => {
  return (
    <Detail
      markdown={`
## Scenario Debug

### Title
${scenario.title}

### Data
\`\`\`json
${JSON.stringify(scenario, null, 2)}
\`\`\`
`}
    />
  );
};

export default ScenarioDebug;
