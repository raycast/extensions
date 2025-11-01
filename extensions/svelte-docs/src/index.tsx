import { Action, ActionPanel, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo, useState } from "react";
import { parse } from "valibot";
import type { ResponseType } from "./schema";
import { response_schema } from "./schema";

function Docs({
  docs_map,
  base_url,
  icon,
}: {
  docs_map: Map<string, (ResponseType & object)["blocks"]>;
  base_url: string;
  icon: string;
}) {
  return [...docs_map.entries()].map(([key, block]) => {
    return (
      <List.Section key={key} title={key}>
        {block.map((sublink) => {
          const [, ...title_pieces] = sublink.breadcrumbs;
          const title = title_pieces.join("->").replace("&gt;", ">").replace("&lt;", "<");
          if (!title) return null;
          return (
            <List.Item
              icon={icon}
              title={title}
              key={sublink.breadcrumbs.join("") + sublink.href + sublink.content}
              subtitle={sublink.content}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={`${base_url}${sublink.href}`} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    );
  });
}

export default function Command() {
  const { isLoading: is_svelte_loading, data: unparsed_svelte_items } = useFetch(`https://svelte.dev/content.json`);

  // eslint-disable-next-line @typescript-eslint/ban-types
  const [filter, setFilter] = useState<"all" | (string & {})>("all");

  const svelte_items = parse(response_schema, unparsed_svelte_items);

  const svelte_mapped = useMemo(() => {
    const svelte_mapped = new Map<string, Map<string, NonNullable<ResponseType>["blocks"]>>();
    for (const block of svelte_items?.blocks ?? []) {
      let main = block.breadcrumbs[0];
      if (main === "Docs") {
        main = block.breadcrumbs[1];
      }
      if (!svelte_mapped.has(main)) {
        svelte_mapped.set(main, new Map());
      }
      const sub_map = svelte_mapped.get(main)!;
      if (!sub_map.has(block.breadcrumbs[0])) {
        sub_map.set(block.breadcrumbs[0], []);
      }
      const already_in = sub_map
        .get(block.breadcrumbs[0])
        ?.find(
          (el) =>
            el.href === block.href &&
            el.content === block.content &&
            el.breadcrumbs.join("") === block.breadcrumbs.join(""),
        );
      if (!already_in) {
        sub_map.get(block.breadcrumbs[0])!.push(block);
      }
    }
    return new Map(
      [...svelte_mapped.entries()].toSorted(([keyA]) => {
        if (keyA === "Svelte") return -1;
        if (keyA === "SvelteKit") return -1;
        return 1;
      }),
    );
  }, [svelte_items]);

  return (
    <List
      isLoading={is_svelte_loading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filtering"
          onChange={(value) => {
            setFilter(value as typeof filter);
          }}
        >
          <List.Dropdown.Item title="All" value="all"></List.Dropdown.Item>
          {[...svelte_mapped.keys()].map((title) => (
            <List.Dropdown.Item key={title} title={title} value={title}></List.Dropdown.Item>
          ))}
        </List.Dropdown>
      }
    >
      {filter === "all" ? (
        [...svelte_mapped.entries()].map(([key, sub_map]) => (
          <Docs key={key} docs_map={sub_map} base_url="https://svelte.dev" icon={"svelte-logo-square.png"} />
        ))
      ) : (
        <Docs docs_map={svelte_mapped.get(filter)!} base_url="https://svelte.dev" icon={"svelte-logo-square.png"} />
      )}
    </List>
  );
}
