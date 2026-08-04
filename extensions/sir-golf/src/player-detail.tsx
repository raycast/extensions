import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { TourId, getAthleteDetail } from "./espn";

/**
 * Side-pane (List.Item.Detail) for a player. Renders immediately from the
 * rows we already have (`base`), then lazily enriches with the athlete's
 * headshot, bio and season stats — but only when the row is selected
 * (`active`), so we don't fan out a fetch per list item.
 */
export function PlayerDetailPane(props: {
  tour: TourId;
  athleteId?: string;
  active: boolean;
  name: string;
  base: { label: string; value: string }[];
}) {
  const { tour, athleteId, active, name, base } = props;

  const { data, isLoading } = useCachedPromise(
    getAthleteDetail,
    [tour, athleteId ?? ""],
    {
      execute: active && !!athleteId,
      keepPreviousData: true,
    },
  );

  // Size the headshot so the whole head + shoulders fits (no name caption —
  // the name is already the row title and the nav title; a caption reflows
  // awkwardly as the image loads in).
  const headshot = data?.headshot;
  const sep = headshot?.includes("?") ? "&" : "?";
  const md = headshot
    ? `![](${headshot}${sep}raycast-width=300&raycast-height=218)`
    : `### ${name}`;

  return (
    <List.Item.Detail
      isLoading={active && !!athleteId && isLoading}
      markdown={md}
      metadata={
        <List.Item.Detail.Metadata>
          {base.map((b) => (
            <List.Item.Detail.Metadata.Label
              key={b.label}
              title={b.label}
              text={b.value}
            />
          ))}

          {data && <List.Item.Detail.Metadata.Separator />}
          {data?.age !== undefined && (
            <List.Item.Detail.Metadata.Label
              title="Age"
              text={String(data.age)}
            />
          )}
          {data?.birthPlace && (
            <List.Item.Detail.Metadata.Label
              title="Birthplace"
              text={data.birthPlace}
            />
          )}
          {data?.turnedPro !== undefined && (
            <List.Item.Detail.Metadata.Label
              title="Turned Pro"
              text={String(data.turnedPro)}
            />
          )}
          {(data?.height || data?.weight) && (
            <List.Item.Detail.Metadata.Label
              title="Height / Weight"
              text={[data?.height, data?.weight].filter(Boolean).join(" · ")}
            />
          )}
          {data?.hand && (
            <List.Item.Detail.Metadata.Label
              title="Plays"
              text={`${data.hand}-handed`}
            />
          )}
          {data?.college && (
            <List.Item.Detail.Metadata.Label
              title="College"
              text={data.college}
            />
          )}

          {data && data.stats.length > 0 && (
            <List.Item.Detail.Metadata.Separator />
          )}
          {data?.stats.map((s) => (
            <List.Item.Detail.Metadata.Label
              key={s.label}
              title={s.label}
              text={s.value}
            />
          ))}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
