import { Job, Workflow } from "../types";
import { useEffect, useState } from "react";
import { circleCIJobs } from "../circleci-functions";
import { List } from "@raycast/api";
import { JobListItem } from "./JobListItem";
import { showError } from "../utils";

export const JobList = ({ workflow }: { workflow: Workflow }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const { id, project_slug, repository } = workflow;

  useEffect(() => {
    circleCIJobs({ id }).then(setJobs).catch(showError);
  }, []);

  return (
    <List navigationTitle={`${project_slug} -> ${repository.branch}`} isLoading={jobs.length === 0}>
      {jobs.map((job) => (
        <JobListItem key={job.id} job={job} workflow={workflow} />
      ))}
    </List>
  );
};
