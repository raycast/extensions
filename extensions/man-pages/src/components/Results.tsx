import { useState, useEffect } from "react";
import { Detail } from "@raycast/api";
import { PageDetail } from "./PageDetail";
import { NotFound } from "./NotFound";
import { runCommand } from "../utils";

export const Results = ({ command }: { command: string }) => {
  const [commandDetails, setCommandDetails] = useState<string | undefined>(undefined);

  useEffect(() => {
    // Obtain man page content
    runCommand(`man ${command} | col -b`, setCommandDetails);
  }, []);

  // Display loading view until we have some command details
  if (commandDetails === undefined) {
    return <Detail isLoading />;
  }

  // Display details if any details are found, otherwise display not found view
  return commandDetails.trim() ? (
    <PageDetail command={command} commandDetails={commandDetails} />
  ) : (
    <NotFound command={command} />
  );
};
