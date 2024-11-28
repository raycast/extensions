import { open, MenuBarExtra, Icon } from "@raycast/api";
import { getFavicon, useFetch } from "@raycast/utils";
import { Job } from "./types";
import { getShortcut } from "./utils";

export default function JobList() {
  const { data: jobs, isLoading } = useFetch<Job[]>("https://larajobs.com/api/jobs");

  return (
    <MenuBarExtra icon={Icon.Rocket} title="Larajobs" tooltip="See latest Larajobs" isLoading={isLoading}>
      {jobs &&
        jobs.map((job, index) => (
          <MenuBarExtra.Item
            key={job.id}
            title={job.title}
            icon={getFavicon(job.url)}
            shortcut={getShortcut(index)}
            onAction={() => open(job.url)}
          />
        ))}
    </MenuBarExtra>
  );
}
