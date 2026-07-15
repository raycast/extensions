import CreateJobForm from "./components/CreateJobForm";
import { popToRoot } from "@raycast/api";

export default function CreateJob() {
  async function handleJobSaved() {
    await popToRoot();
  }

  return <CreateJobForm onJobSaved={handleJobSaved} />;
}
