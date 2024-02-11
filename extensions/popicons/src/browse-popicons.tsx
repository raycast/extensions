import { useMemo, useState } from "react";

import { PopiconGrid } from "./components/popicon-grid/popicon-grid";
import { PopiconGridItem } from "./components/popicon-grid/popicon-grid-item";
import { PopiconGridSection } from "./components/popicon-grid/popicon-grid-section";
import { getPopIconCategories } from "./helpers/get-popicon-categories";
import { usePopicons } from "./hooks/use-popicons";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { newIcons, isLoading, icons } = usePopicons();
  const iconCategories = useMemo(() => getPopIconCategories(icons ?? []), [icons]);

  return (
    <PopiconGrid onSearchTextChange={setSearchText} isLoading={isLoading} filtering>
      {newIcons && searchText === "" && (
        <PopiconGridSection category={newIcons}>
          {newIcons.icons?.map((icon) => (
            <PopiconGridItem key={icon.name} icon={icon} />
          ))}
        </PopiconGridSection>
      )}

      {iconCategories?.map((category) => (
        <PopiconGridSection key={category.title} category={category}>
          {category.icons?.map((icon) => (
            <PopiconGridItem key={icon.name} icon={icon} />
          ))}
        </PopiconGridSection>
      ))}
    </PopiconGrid>
  );
}
