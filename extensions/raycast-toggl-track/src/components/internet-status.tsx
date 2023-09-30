import { Detail, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import isOnline from "is-online";
import { ReactNode, useState } from "react";

interface InternetStatusProps {
  onlineComponent: ReactNode;
}

export default function InternetStatus({ onlineComponent }: InternetStatusProps) {
  const [isItOnline, setIsItOnline] = useState<boolean>(false);
  const [checked, setChecked] = useState<boolean>(false);
  const checkInternetStatus = async () => {
    try {
      const online = await isOnline();

      setIsItOnline(online);
      setChecked(true);
    } catch (error) {
      showToast(Toast.Style.Failure, "An error occurred while checking the internet connection.");
    }
  };

  // Initially check internet status when the component is loaded
  checkInternetStatus();

  if(!checked) return <Detail isLoading={true} />

  if (!isItOnline) {
    return (
      <Detail
        markdown="You are offline. Please check your internet connection."
        actions={
          <ActionPanel>
            <Action title="Refresh" icon="arrow.clockwise" onAction={checkInternetStatus} />
          </ActionPanel>
        }
      />
    );
  } else {
    return <>{onlineComponent}</>;
  }
}
