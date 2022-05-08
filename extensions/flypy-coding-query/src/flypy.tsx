import { ActionPanel, getPreferenceValues, List, Action,Detail } from "@raycast/api";
import React, { ReactElement, useEffect, useState } from "react";
import { getErrorMessage} from "./utils";
import { flypyCoding} from "./coding";


function ListItemFragment(props: { data: any | undefined }): ReactElement | null {
  const data = props.data;
  if (!data || data.length === 0) {
    return null;
  }
  return (
    <React.Fragment>
      <List.Section >
        {data.map((data:any) => (
          <List.Item
            title={`${data[0]}`}
            subtitle={`${data[1]}`}
          />
        ))}
      </List.Section>
    </React.Fragment>
  );
}


export function Flypy() {
  const [query, setQuery] = useState<string>("");
  const { data, error, isLoading } = useSearch(query);
  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Type to Query Words..."
      onSearchTextChange={setQuery}
      throttle
    >
      {error ? (
        <List.EmptyView title="Could not fetch data" description={error} />
      ) : (
        <React.Fragment>
          <ListItemFragment data={data} />
        </React.Fragment>
      )}
    </List>
  );
}

function getDefaultQuery(): string | undefined {
  const pref = getPreferenceValues();
  const q = (pref.defaultquery as string) || undefined;
  return q;
}

export function useSearch(query: string): {
  data: any | undefined;
  error?: string;
  isLoading: boolean;
} {
  const [data, setData] = useState<any>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  let cancel = false;

  useEffect(() => {
    async function fetchData() {
      if (!query) {
        const dq = getDefaultQuery();
        if (dq && dq.length > 0) {
          query = dq;
        }
      }
      if (query === null || cancel) {
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        const wdata = await flypyCoding.getCoding(query);
        if (!cancel) {
          setData(wdata);
        }
      } catch (e: any) {
        if (!cancel) {
          setError(getErrorMessage(e));
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

  return { data, error, isLoading };
}
