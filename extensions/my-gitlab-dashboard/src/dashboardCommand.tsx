import { Detail } from "@raycast/api";
import { MyDashboard } from "./MyDashboard";
import { useMyProjects } from "./hooks/useMyProjects";
import { myProjects as myProjectsFromStorage } from "./storage";
import { checkConfig } from "./utils";
import { useEffect } from "react";

export default function Command() {
  useEffect(() => checkConfig(), []);
  const storage = useMyProjects(myProjectsFromStorage);

  return storage.isLoading ? <EmptyView /> : <MyDashboard projects={storage.data!} />;
}

function EmptyView() {
  return <Detail />;
}
