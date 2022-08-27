import { useEffect, useState } from "react";
import fetch from "node-fetch";
import { PageList } from "./components/PageList";
import { Page, SearchResult } from "./types";

interface SearchArguements {
  project: string;
  searchquery?: string;
}

export default function Command(props: { arguments: SearchArguements }) {
  const [pages, setPages] = useState<Page[] | null>(null);
  const { project, searchquery } = props.arguments;

  useEffect(() => {
    async function fetchPages() {
      const res = await fetch(encodeURI(`https://scrapbox.io/api/pages/${project}/search/query?q=${searchquery}`));
      const json = (await res.json()) as SearchResult;
      setPages(json?.pages);
    }

    fetchPages();
  }, []);

  return <PageList project={project} pages={pages}></PageList>;
}
