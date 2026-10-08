import { ActionPanel, Action, Icon, List, useNavigation, Detail } from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import { Directives, Directive, stringify, loadDocs, title, description } from "./cache-control";

export default function Command() {
  const { push } = useNavigation();
  return (
    <List searchBarPlaceholder="Where is the response allowed to be stored?">
      <List.Item
        title="shared"
        subtitle="private and shared cache"
        accessoryIcon={Icon.ArrowRight}
        accessoryTitle="Browser, Proxies, CDNs"
        actions={
          <ActionPanel>
            <Action title="Select" onAction={() => push(<Duration directive="max-age" directives={[]} />)} />
          </ActionPanel>
        }
      />
      <List.Item
        title="public"
        subtitle="private and shared cache including requests with `Authorization` header"
        accessoryIcon={Icon.ArrowRight}
        accessoryTitle="Browser, Proxies, CDNs"
        actions={
          <ActionPanel>
            <Action title="Select" onAction={() => push(<Duration directive="max-age" directives={["public"]} />)} />
            <Action title="Show `public` Docs" onAction={() => push(<Docs directive="public" />)} />
          </ActionPanel>
        }
      />
      <List.Item
        title="private"
        subtitle="private cache only"
        accessoryIcon={Icon.ArrowRight}
        accessoryTitle="Browser"
        actions={
          <ActionPanel>
            <Action title="Select" onAction={() => push(<Duration directive="max-age" directives={["private"]} />)} />
            <Action title="Show `private` Docs" onAction={() => push(<Docs directive="private" />)} />
          </ActionPanel>
        }
      />
      <List.Item
        title="no-store"
        subtitle="don't store at all"
        actions={
          <ActionPanel>
            <Action title="Finish" onAction={() => push(<Result directives={["no-store"]} />)} />
            <Action title="Show `no-store` Docs" onAction={() => push(<Docs directive="no-store" />)} />
          </ActionPanel>
        }
      />
    </List>
  );
}

interface DirectivesProps {
  directives: Directives;
}

interface DurationProps extends DirectivesProps {
  onSelect?(duration: number): void;
  directive: "max-age" | "s-maxage" | "stale-while-revalidate" | "stale-if-error";
}

function Duration({ directive, directives, onSelect }: DurationProps) {
  const { push, pop } = useNavigation();
  const [unit, setUnit] = useState<"seconds" | "minutes" | "hours" | "days" | "weeks" | "months" | "years">("hours");
  const [search, setSearch] = useState<string>("1");
  const duration = useMemo(() => {
    const d = parseFloat(search);
    if (!d || d < 0 || isNaN(d)) {
      return false;
    }
    switch (unit) {
      case "seconds":
      default:
        return Math.round(d);
      case "minutes":
        return Math.round(d * 60);
      case "hours":
        return Math.round(d * 60 * 60);
      case "days":
        return Math.round(d * 60 * 60 * 24);
      case "weeks":
        return Math.round(d * 60 * 60 * 24 * 7);
      case "months":
        return Math.round(d * 60 * 60 * 24 * (365.25 / 12));
      case "years":
        return Math.round(d * 60 * 60 * 24 * 365.25);
    }
  }, [search, unit]);

  return (
    <List
      navigationTitle={`${directive}=`}
      searchBarPlaceholder="How long is the cache valid?"
      searchText={search}
      onSearchTextChange={setSearch}
      searchBarAccessory={
        <List.Dropdown
          tooltip="select duration unit"
          defaultValue={unit}
          onChange={setUnit as (v: string) => void}
          storeValue={true}
        >
          <List.Dropdown.Item value="seconds" title="seconds" />
          <List.Dropdown.Item value="minutes" title="minutes" />
          <List.Dropdown.Item value="hours" title="hours" />
          <List.Dropdown.Item value="days" title="days" />
          <List.Dropdown.Item value="weeks" title="weeks" />
          <List.Dropdown.Item value="months" title="months" />
          <List.Dropdown.Item value="years" title="years" />
        </List.Dropdown>
      }
    >
      {duration && (
        <List.Item
          title={String(duration)}
          subtitle="seconds"
          accessoryIcon={onSelect ? undefined : Icon.ArrowRight}
          actions={
            <ActionPanel>
              <Action
                title="Select"
                onAction={() => {
                  if (onSelect) {
                    onSelect(duration);
                    pop();
                  } else {
                    push(<Options directives={[...directives, { [directive]: duration } as Directive]} />);
                  }
                }}
              />
              {!onSelect && (
                <Action
                  title="Finish"
                  onAction={() => push(<Result directives={[...directives, { [directive]: duration } as Directive]} />)}
                />
              )}
              <Action
                title="Show `max-age` docs"
                onAction={() => push(<Docs directive={{ [directive]: 0 } as Directive} />)}
              />
            </ActionPanel>
          }
        />
      )}
      {directive === "max-age" && (
        <List.Item
          title="no-cache"
          subtitle="store in caches but revalidate before reuse"
          actions={
            <ActionPanel>
              <Action title="Finish" onAction={() => push(<Result directives={[...directives, "no-cache"]} />)} />
              <Action title="Show `no-cache` Docs" onAction={() => push(<Docs directive="no-cache" />)} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

const REVALIDATION_DIRECTIVES = ["immutable", "must-revalidate", "proxy-revalidate"] as const;
const OTHER_DURATION_DIRECTIVES = ["s-maxage", "stale-while-revalidate", "stale-if-error"] as const;

function Options({ directives }: DirectivesProps) {
  const { push } = useNavigation();
  const [isShowingDetail, setShowingDetail] = useState(false);
  const [revalidation, setRevalidation] = useState<null | typeof REVALIDATION_DIRECTIVES[number]>(null);
  const [durationDirectives, setDurationDirectives] = useState<
    Record<typeof OTHER_DURATION_DIRECTIVES[number], number | null>
  >({
    "s-maxage": null,
    "stale-while-revalidate": null,
    "stale-if-error": null,
  });
  const [mustUnderstand, setMustUnderstand] = useState(false);
  const [noTransform, setNoTransform] = useState(false);

  const actions = (
    <>
      <Action
        title="Finish header"
        onAction={() =>
          push(
            <Result
              directives={[
                ...directives,
                ...(revalidation ? [revalidation] : []),
                ...Object.entries(durationDirectives)
                  .filter(([, duration]) => duration !== null)
                  .map(([key, duration]) => ({ [key]: duration } as Directive)),
                ...(mustUnderstand ? (["must-understand", "no-store"] as Directives) : []),
                ...(noTransform ? (["no-transform"] as Directives) : []),
              ]}
            />
          )
        }
      />
      <Action title="Toggle Docs Split" onAction={() => setShowingDetail((b) => !b)} />
    </>
  );

  return (
    <List navigationTitle="Other Options" isShowingDetail={isShowingDetail}>
      <List.Section title="Revalidation">
        {REVALIDATION_DIRECTIVES.map((d) => (
          <List.Item
            key={d}
            title={d}
            subtitle={description(d)}
            detail={<ItemDocs directive={d} />}
            accessoryIcon={revalidation === d ? Icon.Checkmark : Icon.Circle}
            actions={
              <ActionPanel>
                {revalidation === d ? (
                  <Action title="Deselect" onAction={() => setRevalidation(null)} />
                ) : (
                  <Action title="Select" onAction={() => setRevalidation(d)} />
                )}
                {actions}
                <Action title={`Open \`${d}\` Docs`} onAction={() => push(<Docs directive={d} />)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Other">
        {OTHER_DURATION_DIRECTIVES.map((directive) => (
          <List.Item
            key={directive}
            title={directive}
            subtitle={description({ [directive]: 0 } as Directive)}
            detail={<ItemDocs directive={{ [directive]: 0 } as Directive} />}
            accessoryIcon={durationDirectives[directive] !== null ? Icon.Checkmark : Icon.ArrowRight}
            accessoryTitle={
              durationDirectives[directive] !== null ? `${durationDirectives[directive]} seconds` : undefined
            }
            actions={
              <ActionPanel>
                {durationDirectives[directive] !== null ? (
                  <Action
                    title="Deselect"
                    onAction={() => setDurationDirectives((d) => ({ ...d, [directive]: null }))}
                  />
                ) : (
                  <Action
                    title="Select"
                    onAction={() =>
                      push(
                        <Duration
                          directives={[]}
                          directive={directive}
                          onSelect={(duration) => setDurationDirectives((d) => ({ ...d, [directive]: duration }))}
                        />
                      )
                    }
                  />
                )}
                {actions}
                <Action
                  title={`Open \`${directive}\` docs`}
                  onAction={() => push(<Docs directive={{ [directive]: 0 } as Directive} />)}
                />
              </ActionPanel>
            }
          />
        ))}

        <List.Item
          title="no-transform"
          subtitle={description("no-transform")}
          detail={<ItemDocs directive={"no-transform"} />}
          accessoryIcon={noTransform ? Icon.Checkmark : Icon.Circle}
          actions={
            <ActionPanel>
              {noTransform ? (
                <Action title="Deselect" onAction={() => setNoTransform(false)} />
              ) : (
                <Action title="Select" onAction={() => setNoTransform(true)} />
              )}
              {actions}
              <Action title={"Open `no-transform` Docs"} onAction={() => push(<Docs directive={"no-transform"} />)} />
            </ActionPanel>
          }
        />

        <List.Item
          title="must-understand"
          subtitle={description("must-understand")}
          detail={<ItemDocs directive={"must-understand"} />}
          accessoryIcon={mustUnderstand ? Icon.Checkmark : Icon.Circle}
          actions={
            <ActionPanel>
              {mustUnderstand ? (
                <Action title="Deselect" onAction={() => setMustUnderstand(false)} />
              ) : (
                <Action title="Select" onAction={() => setMustUnderstand(true)} />
              )}
              {actions}
              <Action
                title={"Open `must-understand` docs"}
                onAction={() => push(<Docs directive={"must-understand"} />)}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function Result({ directives }: DirectivesProps) {
  const [docs, setDocs] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    async function create() {
      let docs = "";

      for (const directive of directives) {
        const d = await loadDocs(directive);
        if (d) {
          docs += `#### ${title(directive)}\n${d}\n`;
        }
      }

      if (docs !== "") {
        docs += "\n\nSource: [mdn](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control)";
      }

      setDocs(docs);
    }

    create();
  }, [directives]);

  return (
    <Detail
      navigationTitle="Cache-Control:"
      isLoading={docs === undefined}
      markdown={`# Cache-Control: ${stringify(directives, true)}\n${docs ?? ""}`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Header Value" content={stringify(directives, true)} />
          <Action.CopyToClipboard title="Copy Header Value without spaces" content={stringify(directives, false)} />
        </ActionPanel>
      }
    />
  );
}

function Docs({ directive }: { directive: Directive }) {
  const [docs, setDocs] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    loadDocs(directive).then(setDocs);
  });

  return (
    <Detail
      navigationTitle={`Docs: ${title(directive)}`}
      isLoading={docs === undefined}
      markdown={
        docs
          ? `${docs}\n\nSource: [mdn](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control)`
          : "Not found"
      }
    />
  );
}

function ItemDocs({ directive }: { directive: Directive }) {
  const [docs, setDocs] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    loadDocs(directive).then(setDocs);
  });

  return (
    <List.Item.Detail
      isLoading={docs === undefined}
      markdown={
        docs
          ? `${docs}\n\nSource: [mdn](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control)`
          : "Not found"
      }
    />
  );
}
