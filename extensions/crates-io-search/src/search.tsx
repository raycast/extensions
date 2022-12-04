import { List, showToast, Toast } from "@raycast/api";
import { getPreferenceValues } from "@raycast/api";
import { ReactElement, useState, useEffect } from "react";
import CrateListItem from "./components/CrateListItem";
import fetch from "node-fetch";
import { Crate, Owner } from "./types";

interface Preferences {
  showDetails: boolean;
}

function do_query(text: string | undefined): {
  response?: CrateSearchResponse;
  error?: string;
  isLoading: boolean;
} {
  const [response, setResponse] = useState<CrateSearchResponse>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  let cancel = false;

  useEffect(() => {
    async function fetchData() {
      if (cancel) {
        return;
      }

      if (!text) {
        setIsLoading(false);
        setResponse(undefined);
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        const url = `https://crates.io/api/v1/crates?sort=relevance&page=1&per_page=10&q=${
          encodeURIComponent(text) ?? ""
        }`;

        const response = await fetch(url, { method: "GET" });

        if (!response.ok) {
          setError(response.statusText);
        }

        const json = await response.json();
        const resp = json as CrateSearchResponse;
        const all = resp.crates
          .filter((crate: Crate) => crate.max_stable_version !== null)
          .map(async (crate: Crate) => {
            const owner = crate.links.owners;
            const owner_url = `https://crates.io${owner}`;
            const response = await fetch(owner_url, { method: "GET" });

            if (!response.ok) {
              return crate;
            }
            const json = await response.json();
            const owner_resp = json as OwnerResponse;
            const owner_users = owner_resp.users;
            owner_users.sort((a: Owner, b: Owner) => {
              if (a.kind > b.kind) {
                return 1;
              } else if (a.kind < b.kind) {
                return -1;
              } else {
                return 0;
              }
            });
            const owners_meta = owner_users;
            if (owners_meta) {
              crate.owners = owners_meta;
            }
            return crate;
          });
        resp.crates = await Promise.all(all);

        if (!cancel) {
          setResponse(resp);
        }
      } catch (e) {
        if (!cancel) {
          setError(String(e));
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
  }, [text]);

  return { response, error, isLoading };
}

export default function Main(): ReactElement {
  const [query, setQuery] = useState<string>();
  const { response, error, isLoading } = do_query(query);
  const preferences = getPreferenceValues<Preferences>();

  if (error) {
    showToast(Toast.Style.Failure, "Search crate error", error);
  }

  return (
    <List
      searchBarPlaceholder="Search Rust crates..."
      navigationTitle="Search Rust crates on crates.io"
      onSearchTextChange={setQuery}
      isLoading={isLoading}
      isShowingDetail={preferences.showDetails}
      throttle
    >
      {response?.crates.map((crate: Crate) => (
        <CrateListItem key={crate.id} crate={crate} />
      ))}
    </List>
  );
}

interface CrateSearchResponse {
  crates: Crate[];
}

interface OwnerResponse {
  users: Owner[];
}
