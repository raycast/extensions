import { MenuBarExtra, open } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Response } from "./types";

export default function Command() {
  const { data, isLoading } = useFetch<Response>(`https://app.vuejobs.com/posts/items?limit=-1`, {
    headers: { Accept: "application/json" },
  });

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={{
        source: "vuejobs.png",
      }}
      tooltip="Vue Jobs"
    >
      {data &&
        data.data?.map((job) => (
          <MenuBarExtra.Item
            key={job.slug}
            title={job.title}
            icon={job.organization.avatar || "../assets/vuejobs.png"}
            onAction={() => open(`https://vuejobs.com/jobs/${job.slug}`)}
            subtitle={job.organization.name}
            tooltip={`from ${job.salary?.from || "Not specified"} to ${job.salary?.to || "Not specified"} ${
              job.salary?.currency || "Not specified"
            } - (${job.salary.interval || "Not specified"})`}
          />
        ))}
    </MenuBarExtra>
  );
}
