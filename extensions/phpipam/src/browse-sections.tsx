import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";

import { phpipam } from "./api";
import { ErrorView, SubnetListItem, silentPromiseOptions } from "./components";
import type { Section } from "./types";
import { s, sortSubnets } from "./utils";

function SectionSubnetsView({ section }: { section: Section }) {
  const sectionId = s(section.id);
  const { isLoading, data, error, revalidate } = usePromise(
    (id: string) => phpipam.sectionSubnets(id),
    [sectionId],
    silentPromiseOptions,
  );

  if (error) {
    return <ErrorView error={error} onRetry={revalidate} />;
  }

  const subnets = sortSubnets(data ?? []);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={s(section.name)}
      searchBarPlaceholder="Filter subnets…"
    >
      {subnets.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.Folder} title="No subnets in this section" />
      ) : null}
      {subnets.map((subnet) => (
        <SubnetListItem
          key={s(subnet.id)}
          subnet={subnet}
          sectionId={sectionId}
        />
      ))}
    </List>
  );
}

export default function Command() {
  const { isLoading, data, error, revalidate } = usePromise(
    () => phpipam.sections(),
    [],
    silentPromiseOptions,
  );

  if (error) {
    return <ErrorView error={error} onRetry={revalidate} />;
  }

  const sections = [...(data ?? [])].sort((a, b) =>
    s(a.name).localeCompare(s(b.name)),
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter sections…">
      {sections.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Folder}
          title="No sections found"
          description="Create sections in phpIPAM first."
        />
      ) : null}
      {sections.map((section) => (
        <List.Item
          key={s(section.id)}
          icon={Icon.Folder}
          title={s(section.name)}
          subtitle={s(section.description)}
          keywords={[s(section.description)]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Subnets"
                icon={Icon.ChevronRight}
                target={<SectionSubnetsView section={section} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
