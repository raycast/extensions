import type { Application } from "@raycast/api";
import { Detail, List, getFrontmostApplication } from "@raycast/api";
import { useEffect, useState } from "react";
import { capitalCase, kebabCase } from "change-case";
import { commandNotFoundMd, noContentMd } from "./content/messages";
import type { FormattedMatch } from "./lib/types";
import { getEspansoConfig, getMatches, sortMatches } from "./lib/utils";
import CategoryDropdown from "./components/category-dropdown";
import MatchItem from "./components/match-item";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<FormattedMatch[]>([]);
  const [filteredItems, setFilteredItems] = useState<FormattedMatch[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
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

        const formattedMatches: FormattedMatch[] = sortedMatches
          .filter((match) => !match.form)
          .map((match, index) => {
            let category = match.category;
            let subcategory = "";
            if (!category) {
              const pathParts = match.filePath.split("match/")[1]?.split("/") || [];
              category = pathParts[0]?.replace(".yml", "") ?? "";
              subcategory = pathParts[1]?.replace(".yml", "");
            }
            if (subcategory?.toLowerCase() === "index" || subcategory === category) {
              subcategory = "";
            } else {
              subcategory = kebabCase(subcategory ?? "");
            }
            category = kebabCase(category);
            categoriesSet.add(category);
            return {
              ...match,
              category,
              subcategory,
              triggers: match.triggers,
              replace: match.replace,
              label: match.label,
              filePath: match.filePath,
              index,
            };
          });

        const sortedCategories = Array.from(categoriesSet).sort((a, b) => {
          if (a === "base") return -1;
          if (b === "base") return 1;
          return a.localeCompare(b);
        });

        setItems(formattedMatches);
        setFilteredItems(formattedMatches);
        setCategories(["all", ...sortedCategories]);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : null);
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    setFilteredItems(selectedCategory === "all" ? items : items.filter((item) => item.category === selectedCategory));
  }, [selectedCategory, items]);

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
    if (a === "base") return -1;
    if (b === "base") return 1;
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
      searchBarAccessory={<CategoryDropdown categories={categories} onCategoryChange={setSelectedCategory} />}
    >
      {sortedSectionKeys.map((sectionKey) => {
        const sortedItems = sortItems(sections[sectionKey]);
        return (
          <List.Section key={sectionKey} title={capitalCase(sectionKey)}>
            {sortedItems.map((match, index) => (
              <MatchItem key={match.filePath + index} match={match} sectionKey={sectionKey} application={application} />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}
