import type { Application } from "@raycast/api";
import { Detail, List, getFrontmostApplication, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { commandNotFoundMd, noContentMd } from "./content/messages";
import type { FormattedMatch } from "./lib/types";
import { getEspansoConfig, getMatches, sortMatches, formatCategoryName } from "./lib/utils";
import CategoryDropdown from "./components/category-dropdown";
import ProfileDropdown from "./components/profile-dropdown";
import MatchItem from "./components/match-item";

export default function Command() {
  const { breadcrumbSeparator = "·" } = getPreferenceValues<{ breadcrumbSeparator?: string }>();
  const separator = ` ${breadcrumbSeparator.trim()} `;

  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<FormattedMatch[]>([]);
  const [filteredItems, setFilteredItems] = useState<FormattedMatch[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [profiles, setProfiles] = useState<string[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>("all");
  const [error, setError] = useState<Error | null>(null);
  const [application, setApplication] = useState<Application | undefined>(undefined);

  useEffect(() => {
    getFrontmostApplication().then(setApplication);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { packages: packageFilesDirectory, match: matchFilesDirectory } = getEspansoConfig();

        const combinedMatches = [
          ...getMatches(packageFilesDirectory, { packagePath: true }),
          ...getMatches(matchFilesDirectory),
        ];

        const sortedMatches = sortMatches(combinedMatches);

        const categoriesSet = new Set<string>();

        const profilesSet = new Set<string>();

        const formattedMatches: FormattedMatch[] = sortedMatches
          .filter((match) => !match.form)
          .map((match, index) => {
            const pathParts = match.filePath.split("match/")[1]?.split("/") || [];
            const allParts = pathParts.map((part) => part.replace(".yml", "")).filter(Boolean);

            let profile: string | undefined = undefined;
            let category = "";
            let subcategory = "";

            // Check if path contains profiles folder
            if (allParts[0] === "profiles" && allParts.length > 1) {
              profile = allParts[1]; // Extract profile name (e.g., "work", "home")
              profilesSet.add(profile);

              // Remove "profiles" and profile name from path for category extraction
              const remainingParts = allParts.slice(2);

              if (remainingParts.length > 1) {
                const folderParts = remainingParts.slice(0, -1);
                const fileName = remainingParts[remainingParts.length - 1];
                category = folderParts.map((part) => part.toLowerCase()).join(separator);
                subcategory = fileName.toLowerCase() === "index" ? "" : fileName.toLowerCase();
              } else {
                category = remainingParts[0]?.toLowerCase() || "";
                subcategory = "";
              }
            } else {
              // Non-profile path - use existing logic
              if (allParts.length > 1) {
                const folderParts = allParts.slice(0, -1);
                const fileName = allParts[allParts.length - 1];
                category = folderParts.map((part) => part.toLowerCase()).join(separator);
                subcategory = fileName.toLowerCase() === "index" ? "" : fileName.toLowerCase();
              } else {
                category = allParts[0]?.toLowerCase() || "";
                subcategory = "";
              }
            }

            categoriesSet.add(category);
            return {
              ...match,
              category,
              subcategory,
              profile,
              triggers: match.triggers,
              replace: match.replace,
              label: match.label,
              filePath: match.filePath,
              index,
            };
          });

        const sortedCategories = Array.from(categoriesSet).sort((a, b) => {
          if (a.startsWith("base")) return -1;
          if (b.startsWith("base")) return 1;
          return a.localeCompare(b);
        });

        const sortedProfiles = Array.from(profilesSet).sort((a, b) => a.localeCompare(b));

        setItems(formattedMatches);
        setFilteredItems(formattedMatches);
        setCategories(["all", ...sortedCategories]);
        setProfiles(["all", ...sortedProfiles]);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : null);
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    let filtered = items;

    // Filter by profile
    if (selectedProfile !== "all") {
      filtered = filtered.filter((item) => item.profile === selectedProfile);
    }

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter((item) => item.category === selectedCategory);
    }

    setFilteredItems(filtered);
  }, [selectedCategory, selectedProfile, items]);

  if (error) {
    const notFound = /command not found/.test(error.message);
    return <Detail markdown={notFound ? commandNotFoundMd : error.message} />;
  }

  if (!isLoading && items.length === 0) {
    return <Detail markdown={noContentMd} />;
  }

  const groupByCategory = (matches: FormattedMatch[]) =>
    matches.reduce(
      (sections, match) => {
        const sectionKey = match.category;
        if (!sections[sectionKey]) sections[sectionKey] = [];
        sections[sectionKey].push(match);
        return sections;
      },
      {} as Record<string, FormattedMatch[]>,
    );

  const sections = groupByCategory(filteredItems);

  const sortedSectionKeys = Object.keys(sections).sort((a, b) => {
    if (a.startsWith("base")) return -1;
    if (b.startsWith("base")) return 1;
    return a.localeCompare(b);
  });

  const sortItems = (items: FormattedMatch[]) => {
    return items.sort((a, b) => {
      if (!a.subcategory && b.subcategory) return -1;
      if (a.subcategory && !b.subcategory) return 1;
      if (a.subcategory && b.subcategory) {
        const subcategoryCompare = a.subcategory.localeCompare(b.subcategory);
        if (subcategoryCompare !== 0) return subcategoryCompare;
      }
      const labelA = a.label ?? a.replace;
      const labelB = b.label ?? b.replace;
      return labelA.localeCompare(labelB);
    });
  };

  return (
    <List
      isShowingDetail
      isLoading={isLoading}
      searchBarAccessory={
        <>
          {profiles.length > 1 && <ProfileDropdown profiles={profiles} onProfileChange={setSelectedProfile} />}
          <CategoryDropdown categories={categories} onCategoryChange={setSelectedCategory} />
        </>
      }
    >
      {sortedSectionKeys.map((sectionKey) => {
        const sortedItems = sortItems(sections[sectionKey]);
        return (
          <List.Section key={sectionKey} title={formatCategoryName(sectionKey)}>
            {sortedItems.map((match, index) => (
              <MatchItem key={match.filePath + index} match={match} sectionKey={sectionKey} application={application} />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}
