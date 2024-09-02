import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { List } from "@raycast/api";
import { PromptListItem } from "./PromptListItem";
import { fetchSections } from "../utils";

export const PromptsList = () => {
  const [showingDetail, setShowingDetail] = useState<boolean>(true);

  // const cached = cache.get("favoritePrompts");
  // const favoritePrompts = !cache.isEmpty && cached ? JSON.parse(cached) as string[] : [];

  const { data: sections, isLoading } = useCachedPromise(() => fetchSections());

  return (
    <List isLoading={isLoading || sections === undefined} isShowingDetail={showingDetail}>
      {/* { */}
      {/*   favoritePrompts.length > 1 && favoritePrompts.map((slug) => ( */}
      {/*     <PromptListItem */}
      {/*       key={slug} */}
      {/*       slug={slug} */}
      {/*       section="Favorite" */}
      {/*       setShowingDetail={setShowingDetail} */}
      {/*       showingDetail={showingDetail} */}
      {/*     /> */}
      {/*   )) */}
      {/* } */}
      {sections?.map((section) => (
        <List.Section key={section.name} title={section.name}>
          {section.slugs.map((slug, index) => (
            <PromptListItem
              key={slug + index} // remove index for release version
              slug={slug}
              section={section.name}
              setShowingDetail={setShowingDetail}
              showingDetail={showingDetail}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
};
