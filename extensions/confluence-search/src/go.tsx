import "cross-fetch/polyfill";

import { List, Color } from "@raycast/api";
import { useState, useEffect } from "react";
import { useAuthorizeSite } from "./util/hooks";
import { Site } from "./api/site";
import { StandardUrlActionPanel } from "./util/action-panels";

function useLocations(site?: Site) {
  const [locations, setLocations] = useState<Location[]>();

  useEffect(() => {
    if (!site) return;

    setLocations([
      {
        title: "Home",
        url: site.url + "/wiki/home",
        icon: "home.svg",
      },
      {
        title: "Recent",
        subtitle: "Home",
        url: site.url + "/wiki/home/recent",
        icon: "recent.svg",
      },
      {
        title: "Starred",
        subtitle: "Home",
        url: site.url + "/wiki/home/starred",
        icon: "starred.svg",
      },
      {
        title: "Drafts",
        subtitle: "Home",
        url: site.url + "/wiki/home/drafts",
        icon: "drafts.svg",
      },
      {
        title: "Spaces",
        url: site.url + "/wiki/spaces",
        icon: "folder.svg",
      },
      {
        title: "People",
        url: site.url + "/wiki/people/search",
        icon: "people.svg",
      },
      {
        title: "Templates",
        url: site.url + "/wiki/templates",
        icon: "documents.svg",
      },
      {
        title: "Search",
        url: site.url + "/wiki/search",
        icon: "search.svg",
      },
      // Others to eventually add:
      // Personal Space (need to look up the space id/key for it)
      // Administration / Settings (if they have permission)
    ]);
  }, [site]);

  return locations;
}

export default function Command() {
  const site = useAuthorizeSite();
  const locations = useLocations(site);

  return (
    <List isLoading={!locations}>
      {locations?.map((l) => (
        <List.Item
          key={l.title}
          title={l.title}
          subtitle={l.subtitle}
          icon={{ source: l.icon, tintColor: Color.Blue }}
          actions={<StandardUrlActionPanel url={l.url} />}
        />
      ))}
    </List>
  );
}

interface Location {
  title: string;
  subtitle?: string;
  url: string;
  icon: string;
}
