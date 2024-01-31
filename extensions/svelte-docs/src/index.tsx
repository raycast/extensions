import { Action, ActionPanel, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { parse } from "valibot";
import { response_schema } from "./schema";
import type { ResponseType } from "./schema";
import { useMemo, useState } from "react";

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
              key={JSON.stringify(sublink)}
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
  const { isLoading: is_sveltekit_loading, data: unparsed_sveltekit_items } = useFetch(
    `https://kit.svelte.dev/content.json`,
  );

  const [filter, setFilter] = useState<"both" | "svelte" | "kit">("both");

  const svelte_items = parse(response_schema, unparsed_svelte_items);
  const sveltekit_items = parse(response_schema, unparsed_sveltekit_items);

  const svelte_mapped = useMemo(() => {
    const svelte_mapped = new Map();
    for (const block of svelte_items?.blocks ?? []) {
      if (!svelte_mapped.has(block.breadcrumbs[0])) {
        svelte_mapped.set(block.breadcrumbs[0], []);
      }
      svelte_mapped.get(block.breadcrumbs[0]).push(block);
    }
    return svelte_mapped;
  }, [svelte_items]);

  const sveltekit_mapped = useMemo(() => {
    const sveltekit_mapped = new Map();
    for (const block of sveltekit_items?.blocks ?? []) {
      if (!sveltekit_mapped.has(block.breadcrumbs[0])) {
        sveltekit_mapped.set(block.breadcrumbs[0], []);
      }
      sveltekit_mapped.get(block.breadcrumbs[0]).push(block);
    }
    return sveltekit_mapped;
  }, [sveltekit_items]);

  return (
    <List
      isLoading={is_svelte_loading || is_sveltekit_loading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filtering"
          onChange={(value) => {
            setFilter(value as typeof filter);
          }}
        >
          <List.Dropdown.Item title="Svelte and Sveltekit" value="both"></List.Dropdown.Item>
          <List.Dropdown.Item title="Svelte Only" value="svelte"></List.Dropdown.Item>
          <List.Dropdown.Item title="SvelteKit Only" value="kit"></List.Dropdown.Item>
        </List.Dropdown>
      }
    >
      {filter !== "kit" && (
        <Docs docs_map={svelte_mapped} base_url="https://svelte.dev" icon={"svelte-logo-square.png"} />
      )}
      {filter !== "svelte" && (
        <Docs docs_map={sveltekit_mapped} base_url="https://kit.svelte.dev" icon="sveltekit-logo-square.png" />
      )}
    </List>
  );
}
