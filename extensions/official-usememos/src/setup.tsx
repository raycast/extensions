import { SetupGuide } from "./components/SetupGuide";
import { useConnectionCheck } from "./hooks/useConnectionCheck";

const SetupCommand = () => {
  const { revalidate, ...state } = useConnectionCheck();
  return <SetupGuide {...state} onRetry={revalidate} />;
};

export default SetupCommand;
