import { List, showToast, Toast } from "@raycast/api";
import { getStoredLinks, saveStoredLinks } from "./utils/local-storage";
import LinkListItem from "./linkLinkItem";
import { useEffect, useState } from "react";

import { RLLink } from "./utils/types";

export default function showAllLinksInRaycast() {
  const [links, setLinks] = useState<Array<RLLink>>([]);

  // this is a custom hook that will fetch the currenty stored links from local storage, and store it in "links"
  useEffect(() => {
    const getDataFromStorage = async () => {
      getStoredLinks().then((links) => {
        setLinks(links);
      });
    };

    getDataFromStorage();
  }, []);

  async function handleDeleteLink(linkId: string) {
    const newLinks = links.filter((link) => link.id !== linkId);
    setLinks(newLinks);
    await saveStoredLinks(newLinks);
    await showToast(Toast.Style.Success, `Link Deleted!`);
  }

  return (
    <List navigationTitle="Search links" searchBarPlaceholder="Search links">
      {links.map((link) => (
        <LinkListItem link={link} key={link.id} onDelete={handleDeleteLink} />
      ))}
    </List>
  );
}
