import { List, showToast, Toast, popToRoot } from "@raycast/api";
import { Documents } from "./views";
import { useActiveRef } from "./hooks";
import { useEffect } from "react";

const Command = () => {
  const { isLoading, error } = useActiveRef();

  const handleError = async () => {
    await showToast(Toast.Style.Failure, "Failed to get active ref");
    popToRoot();
  };

  useEffect(() => {
    if (error) handleError();
  }, [error]);

  if (isLoading) return <List isLoading={true} />;
  return <Documents />;
};

export default Command;
