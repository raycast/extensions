import { Action, Color, Icon, List } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { Actions } from "../actions";
import { DiggerResult, ResourceStatus, WellKnownData } from "../types";
import { WellKnownListView } from "./WellKnownListView";

interface WellKnownProps {
  data: DiggerResult | null;
  onRefresh: () => void;
  progress: number;
}

/**
 * The `/.well-known/` section.
 *
 * The path prefix cannot be listed — there is no directory index — so this is the
 * result of probing the IANA catalog and judging each answer. See
 * `src/utils/wellKnownUtils.ts` for why the verdict is the content type rather
 * than the status code.
 */
export function WellKnown({ data, onRefresh, progress }: WellKnownProps) {
  const isLoading = progress < 1;
  const listIcon = isLoading ? getProgressIcon(progress, Color.Blue) : Icon.Info;

  if (!data) {
    return (
      <List.Item
        title="Well-Known"
        icon={listIcon}
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Checking well-known files..." />
                <List.Item.Detail.Metadata.Label title="" text="Probing /.well-known/ paths" />
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
    );
  }

  const wellKnown = data.wellKnown;
  const status: ResourceStatus | undefined = data.lookups?.wellKnown;
  const hitCount = wellKnown?.catchAll ? 0 : (wellKnown?.hits.length ?? 0);

  return (
    <List.Item
      title="Well-Known"
      icon={listIcon}
      accessories={
        hitCount > 0 ? [{ text: `${hitCount}` }, { icon: { source: Icon.Check, tintColor: Color.Green } }] : undefined
      }
      detail={<WellKnownDetail wellKnown={wellKnown} status={status} isLoading={isLoading} />}
      actions={
        <Actions
          data={data}
          url={data.url}
          onRefresh={onRefresh}
          sectionActionsFirst
          sectionActions={
            wellKnown && (
              <Action.Push
                title="View Well-Known Files"
                icon={Icon.List}
                target={<WellKnownListView data={wellKnown} />}
              />
            )
          }
        />
      }
    />
  );
}

interface WellKnownDetailProps {
  wellKnown: WellKnownData | undefined;
  status: ResourceStatus | undefined;
  isLoading: boolean;
}

function WellKnownDetail({ wellKnown, status, isLoading }: WellKnownDetailProps) {
  // Three states, not two. The sweep is still running / it ran and the host
  // publishes nothing / it could not run at all. Only the middle one is a claim
  // about the host, and only it may say "None published".
  if (!wellKnown) {
    const label =
      isLoading && status === undefined ? "Checking…" : status === "unavailable" ? "Couldn't check" : "None";
    const icon =
      isLoading && status === undefined
        ? Icon.Clock
        : { source: Icon.QuestionMarkCircle, tintColor: Color.Orange as Color };
    return (
      <List.Item.Detail
        metadata={
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="Well-Known Files" text={label} icon={icon} />
            {status === "unavailable" && !isLoading && (
              <List.Item.Detail.Metadata.Label
                title=""
                text="The sweep did not complete, so nothing about this host's /.well-known/ has been established."
              />
            )}
          </List.Item.Detail.Metadata>
        }
      />
    );
  }

  const { hits, probed, unchecked, catchAll } = wellKnown;

  // The host answered for a control path nothing publishes. Every per-path
  // answer is that same catch-all, so the sweep ran and established nothing —
  // which is not the same as a host that publishes nothing.
  if (catchAll) {
    return (
      <List.Item.Detail
        metadata={
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label
              title="Well-Known Files"
              text="Couldn't establish"
              icon={{ source: Icon.QuestionMarkCircle, tintColor: Color.Orange }}
            />
            <List.Item.Detail.Metadata.Label
              title=""
              text={`This host returns a file for every path under /.well-known/, including one nothing publishes. All ${probed} answers are that same catch-all.`}
            />
          </List.Item.Detail.Metadata>
        }
      />
    );
  }

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Published Files"
            text={`${hits.length} of ${probed} paths probed`}
            icon={
              hits.length > 0
                ? { source: Icon.Check, tintColor: Color.Green }
                : { source: Icon.Xmark, tintColor: Color.Red }
            }
          />
          {wellKnown.controlUnchecked && (
            <List.Item.Detail.Metadata.Label
              title="Confidence"
              text="The control probe failed, so whether this host answers every path is unknown"
              icon={{ source: Icon.QuestionMarkCircle, tintColor: Color.Orange }}
            />
          )}
          {unchecked && unchecked.length > 0 && (
            <List.Item.Detail.Metadata.Label
              title="Couldn't Check"
              text={`${unchecked.length} paths got no response`}
              icon={{ source: Icon.QuestionMarkCircle, tintColor: Color.Orange }}
            />
          )}
          {hits.length > 0 && <List.Item.Detail.Metadata.Separator />}
          {hits.map((hit) => (
            <List.Item.Detail.Metadata.Link
              key={hit.path}
              title={hit.path}
              target={hit.url}
              text={hit.contentType.split(";")[0]}
            />
          ))}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
