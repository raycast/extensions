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
            icon={job.organization.avatar}
            onAction={() => open(`https://vuejobs.com/jobs/${job.slug}`)}
          />
        ))}
    </MenuBarExtra>
  );
}
