import { ActionPanel, CopyToClipboardAction, List, showToast, ToastStyle } from "@raycast/api";
import { useState, useEffect } from "react";
import { createHomeAssistantClient } from "../common";

export const ha = createHomeAssistantClient();

class Attribute {
  public name = "";
  public value: any;
}

export function StatesAttributesList(props: { domain: string }) {
  const [searchText, setSearchText] = useState<string>();
  const { attributes, error, isLoading } = useSearch(searchText, props.domain);

  if (error) {
    showToast(ToastStyle.Failure, "Cannot search Home Assistant states", error);
  }

  if (!attributes) {
    return <List isLoading={true} searchBarPlaceholder="Loading" />;
  }

  return (
    <List
      searchBarPlaceholder="Filter by entity ID or attribute name"
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
    >
      {attributes?.map((attr) => (
        <List.Item
          key={attr.name}
          title={attr.name}
          accessoryTitle={`${attr.value}`.substring(0, 50)}
          actions={
            <ActionPanel>
              <CopyToClipboardAction content={`${attr.value}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export function useSearch(
  query: string | undefined,
  domain: string
): {
  attributes?: Attribute[];
  error?: string;
  isLoading: boolean;
} {
  const [attributes, setAttributes] = useState<Attribute[]>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  let cancel = false;

  useEffect(() => {
    async function fetchData() {
      if (query === null || cancel) {
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        const haStates = await ha.getStates({ domain: domain, query: "" });
        let attributesData: Attribute[] = [];
        haStates.forEach((e) =>
          Object.entries(e.attributes).forEach(([k, v]) =>
            attributesData.push({ name: `${e.entity_id}.${k}`, value: v })
          )
        );
        if (query) {
          const lquery = query.toLocaleLowerCase().trim();
          attributesData = attributesData.filter((v) => v.name.toLocaleLowerCase().includes(lquery));
        }
        attributesData = attributesData.slice(0, 100);
        if (!cancel) {
          setAttributes(attributesData);
        }
      } catch (e: any) {
        if (!cancel) {
          setError(e.toString());
        }
      } finally {
        if (!cancel) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancel = true;
    };
  }, [query]);

  return { attributes, error, isLoading };
}
