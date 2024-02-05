import { useEffect, useState } from "react";

import { Detail } from "@raycast/api";

import type { Project } from "@/api/types";

const DebugProject = ({ project }: { project: Project }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [json, setJson] = useState("Loading...");

  useEffect(() => {
    const stringified = JSON.stringify(project, null, 4);
    setJson(stringified);
    setIsLoading(false);
  }, []);

  return (
    <Detail
      isLoading={isLoading}
      markdown={`
# ${project.name}

\`\`\`json
${json}
\`\`\`
                    `}
    />
  );
};

export default DebugProject;
