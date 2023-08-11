import { open, MenuBarExtra, Icon } from "@raycast/api";
import { getFavicon, useFetch } from "@raycast/utils";

interface Tag {
  name: string;
  slug: string;
}

interface Job {
  id: number;
  organization: string;
  title: string;
  location: string;
  type: string;
  url: string;
  salary?: string;
  published_at: string;
  tags: Array<Tag>;
}

export default function JobList() {
  const { data: jobs, error } = useFetch<Job[]>("https://larajobs.com/api/jobs");

  if (error) {
    return (
      <MenuBarExtra icon={Icon.Warning} title="Failed to fetch jobs" />
    )
  }

  if (!jobs) {
    return (
      <MenuBarExtra icon={Icon.MagnifyingGlass} title="Fetching Jobs"></MenuBarExtra>
    )
  }

  return (
    <MenuBarExtra icon={Icon.Rocket} title="Larajobs" tooltip="See latest Larajobs">

      {jobs.map((job) => (
        <MenuBarExtra.Item
          key={job.id}
          title={job.title}
          icon={getFavicon(job.url)}
          onAction={() => open(job.url)}
        />
      ))}

    </MenuBarExtra>
  );
}