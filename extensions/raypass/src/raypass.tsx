import { List, showToast, Toast, popToRoot } from "@raycast/api";
import { Documents, Records } from "./views";
import { useActiveRef } from "./hooks";
import { useEffect } from "react";

const Command = () => {
  const { isLoading, data: ref, error } = useActiveRef();

  const handleError = async () => {
    await showToast(Toast.Style.Failure, "Failed to get active ref");
    popToRoot();
  };

  useEffect(() => {
    if (error) handleError();
  }, [error]);

  if (isLoading) return <List isLoading={true} />;
  if (!ref) return <Documents />;
  return <Records />;
};

export default Command;
