import { Action } from "@raycast/api";
import { openInTim } from "../../lib/tim";
import { UUID } from "../../types/tim";

export const OpenInTimAction: React.FC<{ id: UUID }> = ({ id }) => {
  const handleAction = async () => openInTim(id);

  return <Action title="Open in Tim" icon="tim-icon.png" onAction={handleAction} />;
};
