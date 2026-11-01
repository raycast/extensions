import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getFamily, listFamilies } from "./lib/api";
import { FamilyView } from "./lib/views";

export default function FragranceFamilies() {
  const { data, isLoading, error } = usePromise(listFamilies);
  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Filter fragrance families">
      {error && <List.EmptyView title="Could not load families" description={error.message} icon={Icon.Warning} />}
      {data?.map((f) => (
        <List.Item
          key={f.id}
          title={f.name}
          accessories={[{ text: `${f.perfumeCount}` }]}
          detail={
            <List.Item.Detail
              markdown={`# ${f.name}\n\n${f.definition}`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Perfumes" text={String(f.perfumeCount)} />
                  {f.subfamilies.length > 0 && (
                    <List.Item.Detail.Metadata.TagList title="Subfamilies">
                      {f.subfamilies.map((s) => (
                        <List.Item.Detail.Metadata.TagList.Item key={s} text={s} />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <FamilyPush id={f.id} name={f.name} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function FamilyPush({ id, name }: { id: string; name: string }) {
  return <Action.Push title={`Show ${name} Perfumes`} icon={Icon.List} target={<FamilyLoader id={id} />} />;
}

function FamilyLoader({ id }: { id: string }) {
  const { data, isLoading, error } = usePromise(getFamily, [id]);
  if (!data) {
    return (
      <List isLoading={isLoading} searchBarPlaceholder="Filter signature perfumes">
        {error && <List.EmptyView title="Could not load family" description={error.message} icon={Icon.Warning} />}
      </List>
    );
  }
  return <FamilyView family={data} />;
}
