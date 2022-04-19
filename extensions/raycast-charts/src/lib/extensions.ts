import fetch from "node-fetch";
import useSWR from "swr";

export interface User {
  name: string;
  handle: string;
}

export interface Icons {
  light: string | null | undefined;
  dark: string | null | undefined;
}

export interface Extension {
  id: string;
  name: string;
  download_count: number;
  author: User;
  owner: User;
  store_url: string;
  icons: Icons;
}

export interface Data {
  data: Extension[];
}

async function fetchExtensions(): Promise<any> {
  return await fetch("https://www.raycast.com/api/v1/store_listings?per_page=2000&include_native=true").then((res) =>
    res.json()
  );
}

export function useExtensions(): { extensions: Extension[] | undefined; isLoading: boolean } {
  const { data, error } = useSWR<Data>("extensions", fetchExtensions);
  const isLoading = !data;
  const extensions = data?.data;

  return { extensions, isLoading };
}
