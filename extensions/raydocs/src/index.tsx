import { List } from "@raycast/api";
import { useState } from "react";
import LinkItem from "@/components/LinkItem";
import { Link } from "@/types";
import { getLinks } from "@/utils/links";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [links, setLinks] = useState<Link[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  (async function () {
    if (links.length) return;
    const resLinks = await getLinks();
    if (!resLinks) return;

    setCategories([...new Set(resLinks?.map((link) => link?.sectionTitle ?? "") ?? [])]);
    setLinks(resLinks);
    setIsLoading(false);
  })();

  return (
    <List isLoading={isLoading}>
      {categories?.map((category) => (
        <List.Section key={category} title={category}>
          {links
            .filter((el) => el.sectionTitle === category)
            .map((link) => (
              <LinkItem key={link.id} link={link} />
            ))}
        </List.Section>
      ))}
      <List.Section title="Uncategorized">
        {links
          .filter((el) => !el.sectionTitle)
          .map((link) => (
            <LinkItem key={link.id} link={link} />
          ))}
      </List.Section>
    </List>
  );
}
