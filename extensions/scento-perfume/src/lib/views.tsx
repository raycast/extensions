import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { FamilyDetail, Material, Neighbour, PerfumeMatch, getMaterial, getNeighbours, getPortrait } from "./api";
import { materialMarkdown, portraitMarkdown } from "./markdown";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function PerfumeDetail({ perfume }: { perfume: PerfumeMatch }) {
  const { data, isLoading, error } = usePromise(getPortrait, [perfume]);
  if (error) {
    return <Detail markdown={`# ${perfume.name}\n\n${error.message}`} navigationTitle={perfume.name} />;
  }
  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={perfume.name}
      markdown={data ? portraitMarkdown(data) : `# ${perfume.name}`}
      metadata={
        data && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="House" text={data.house} />
            {data.family && <Detail.Metadata.Label title="Scent Family" text={data.family} />}
            {data.subfamily && <Detail.Metadata.Label title="Subfamily" text={data.subfamily} />}
            {data.concentration && <Detail.Metadata.Label title="Concentration" text={cap(data.concentration)} />}
            {data.year && <Detail.Metadata.Label title="Year" text={String(data.year)} />}
            {data.characterWords.length > 0 && (
              <Detail.Metadata.TagList title="Character">
                {data.characterWords.map((w) => (
                  <Detail.Metadata.TagList.Item key={w} text={cap(w)} />
                ))}
              </Detail.Metadata.TagList>
            )}
            {data.seasons.length > 0 && (
              <Detail.Metadata.Label title="Seasons" text={data.seasons.map(cap).join(", ")} />
            )}
            {data.hours.length > 0 && (
              <Detail.Metadata.Label title="Time of Day" text={data.hours.map(cap).join(", ")} />
            )}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Link title="Scento" target={data.url} text="Open on Scento" />
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open on Scento" url={data?.url ?? perfume.page} />
          <Action.Push title="Show Similar Perfumes" icon={Icon.List} target={<SimilarPerfumes perfume={perfume} />} />
          <Action.CopyToClipboard title="Copy Name" content={`${perfume.name} by ${perfume.house}`} />
        </ActionPanel>
      }
    />
  );
}

export function SimilarPerfumes({ perfume }: { perfume: PerfumeMatch }) {
  const { data, isLoading, pagination, error } = usePromise(
    (p: PerfumeMatch) =>
      async ({ cursor }: { page: number; cursor?: string }) => {
        const res = await getNeighbours(p, cursor);
        return { data: res.items, hasMore: res.cursor !== null, cursor: res.cursor ?? undefined };
      },
    [perfume],
  );
  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      pagination={pagination}
      navigationTitle={`Similar to ${perfume.name}`}
      searchBarPlaceholder="Filter similar perfumes"
    >
      {error && (
        <List.EmptyView title="Could not load similar perfumes" description={error.message} icon={Icon.Warning} />
      )}
      {(data as Neighbour[] | undefined)?.map((n) => (
        <List.Item
          key={`${n.name}-${n.house}`}
          title={n.name}
          keywords={[n.house, ...(n.family ? [n.family] : [])]}
          detail={
            <List.Item.Detail
              markdown={`# ${n.name}\n\n_${n.house}_\n\n${n.difference ?? ""}`}
              metadata={
                <List.Item.Detail.Metadata>
                  {n.family && <List.Item.Detail.Metadata.Label title="Scent Family" text={n.family} />}
                  {n.shared.length > 0 && (
                    <List.Item.Detail.Metadata.TagList title="Shared Notes">
                      {n.shared.map((s) => (
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
              <Action.OpenInBrowser title="Open on Scento" url={n.page} />
              <Action.Push title="Show Perfume Notes" icon={Icon.Eye} target={<PerfumeDetail perfume={n} />} />
              <Action.CopyToClipboard title="Copy Name" content={`${n.name} by ${n.house}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export function MaterialDetail({ name, fallbackUrl }: { name: string; fallbackUrl: string }) {
  const { data, isLoading, error } = usePromise(getMaterial, [name]);
  const m: Material | undefined = data;
  if (error) return <Detail markdown={`# ${name}\n\n${error.message}`} navigationTitle={name} />;
  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={name}
      markdown={m ? materialMarkdown(m) : `# ${name}`}
      metadata={
        m && (
          <Detail.Metadata>
            {m.family && <Detail.Metadata.Label title="Material Family" text={m.family} />}
            {m.scentoFamily && <Detail.Metadata.Label title="Scent Family" text={m.scentoFamily} />}
            {m.naturalOrSynthetic && <Detail.Metadata.Label title="Origin Type" text={cap(m.naturalOrSynthetic)} />}
            {m.origin && <Detail.Metadata.Label title="Origin" text={m.origin} />}
            {m.aliases.length > 0 && (
              <Detail.Metadata.TagList title="Also Called">
                {m.aliases.slice(0, 4).map((a) => (
                  <Detail.Metadata.TagList.Item key={a} text={a} />
                ))}
              </Detail.Metadata.TagList>
            )}
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open on Scento" url={m?.url ?? fallbackUrl} />
          {m?.showcasedIn.map((s) => (
            <Action.OpenInBrowser key={s.name + s.house} title={`Open ${s.name} on Scento`} url={s.page} />
          ))}
        </ActionPanel>
      }
    />
  );
}

export function FamilyView({ family }: { family: FamilyDetail }) {
  return (
    <List navigationTitle={family.name} searchBarPlaceholder="Filter signature perfumes">
      <List.Section title={family.name} subtitle={`${family.perfumeCount} perfumes`}>
        {family.exemplars.map((e) => (
          <List.Item
            key={e.name + e.house}
            title={e.name}
            subtitle={e.house}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Perfume Notes"
                  icon={Icon.Eye}
                  target={<PerfumeDetail perfume={{ ...e, family: family.name }} />}
                />
                <Action.OpenInBrowser title="Open on Scento" url={e.page} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
