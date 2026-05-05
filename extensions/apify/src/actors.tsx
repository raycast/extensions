import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { apify } from "./apify";
import { formatDate } from "./utils";

export default function Actors() {
  const { isLoading, data: actors } = useCachedPromise(
    async () => {
      const { items } = await apify.actors().list();
      return items;
    },
    [],
    {
      initialData: [],
    },
  );

  return (
    <List isLoading={isLoading}>
      {actors.map((actor) => (
        <List.Item
          key={actor.id}
          icon={Icon.Code}
          title={actor.name}
          subtitle={actor.username}
          accessories={[
            { text: `Created ${formatDate(actor.createdAt)}` },
            { text: `Modified ${formatDate(actor.modifiedAt)}` },
          ]}
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Code} title="Get Actor" target={<GetActor id={actor.id} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function GetActor({ id }: { id: string }) {
  const { isLoading, data: actor } = usePromise(async () => {
    const actor = await apify.actor(id).get();
    return actor;
  });

  const markdown = !actor
    ? ""
    : `# ${actor.seoTitle || actor.title || actor.name} \n\n ${actor.seoDescription || actor.description}`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        actor && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Actor ID" text={actor.id} />
            <Detail.Metadata.TagList title="Categories">
              {actor.categories?.map((category) => (
                <Detail.Metadata.TagList.Item key={category} text={category} />
              ))}
            </Detail.Metadata.TagList>
          </Detail.Metadata>
        )
      }
    />
  );
}
