import { Action, Icon } from "@raycast/api";

export default function StationDetailsAction(props: {
  showDetails: boolean;
  setShowDetails: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { showDetails, setShowDetails } = props;
  return <Action title={"View Station Details"} icon={Icon.Info} onAction={async () => setShowDetails(!showDetails)} />;
}
