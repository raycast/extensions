import { Action, ActionPanel, Application, Clipboard, Detail, List, getFrontmostApplication, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { ProcessOutput } from "zx";
import { capitalCase, kebabCase } from "change-case";

import { commandNotFoundMd, noContentMd } from "./content/messages";

import { FormattedMatch } from "./lib/types";
import { getEspansoConfig, getMatches, sortMatches } from "./lib/utils";

import CategoryDropdown from "./components/category-dropdown";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<FormattedMatch[]>([]);
  const [filteredItems, setFilteredItems] = useState<FormattedMatch[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [error, setError] = useState<ProcessOutput | null>(null);
  const [application, setApplication] = useState<Application | undefined>(undefined);

  useEffect(() => {
    getFrontmostApplication().then(setApplication);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { packages: packageFilesDirectory, match: matchFilesDirectory } = await getEspansoConfig();

        const combinedMatches = [
          ...getMatches(packageFilesDirectory, { packagePath: true }),
          ...getMatches(matchFilesDirectory),
        ];

        const sortedMatches = sortMatches(combinedMatches);

        const categoriesSet = new Set<string>();
        const formattedMatches: FormattedMatch[] = sortedMatches.map((match) => {
          const pathParts = match.filePath.split("match/")[1]?.split("/") || [];
          let category = pathParts[0]?.replace(".yml", "") ?? "";
          let subcategory = pathParts[1]?.replace(".yml", "");

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
            form: match.form,
            label: match.label,
            filePath: match.filePath,
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
        setError(err instanceof ProcessOutput ? err : null);
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    setFilteredItems(selectedCategory === "all" ? items : items.filter((item) => item.category === selectedCategory));
  }, [selectedCategory, items]);

  if (error) {
    const notFound = /command not found/.test(error.stderr);
    return <Detail markdown={notFound ? commandNotFoundMd : error.stderr} />;
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
            {sortedItems.map(({ triggers, replace, form, label, filePath, subcategory }, index) => {
              const itemKey = `${filePath}-${index}`;

              return (
                <List.Item
                  key={itemKey}
                  title={label ?? triggers.join(", ")}
                  subtitle={subcategory ? capitalCase(subcategory) : ""}
                  detail={
                    <List.Item.Detail
                      markdown={form ? "`form` is not supported yet." : replace}
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.TagList title="Triggers">
                            {triggers.map((trigger: string) => (
                              <List.Item.Detail.Metadata.TagList.Item key={trigger} text={trigger} color="#d7d0d1" />
                            ))}
                          </List.Item.Detail.Metadata.TagList>
                          {label && (
                            <List.Item.Detail.Metadata.TagList title="Label">
                              <List.Item.Detail.Metadata.TagList.Item text={label} color="#d7d0d1" />
                            </List.Item.Detail.Metadata.TagList>
                          )}
                          <List.Item.Detail.Metadata.TagList title="Category">
                            <List.Item.Detail.Metadata.TagList.Item text={capitalCase(sectionKey)} color="#8da0cb" />
                          </List.Item.Detail.Metadata.TagList>
                          {subcategory && (
                            <List.Item.Detail.Metadata.TagList title="Subcategory">
                              <List.Item.Detail.Metadata.TagList.Item text={capitalCase(subcategory)} color="#fc8d62" />
                            </List.Item.Detail.Metadata.TagList>
                          )}
                          <List.Item.Detail.Metadata.Label title="File" text={filePath} />
                        </List.Item.Detail.Metadata>
                      }
                    />
                  }
                  actions={
                    <ActionPanel>
                      {!form && (
                        <>
                          <Action
                            icon={Icon.Desktop}
                            title={`Paste to ${application?.name}`}
                            onAction={() => Clipboard.paste(replace)}
                          />

                          <Action.CopyToClipboard title="Copy Content" content={replace} />
                        </>
                      )}
                      <Action.CopyToClipboard title="Copy Triggers" content={triggers.join(", ")} />
                      {label && <Action.CopyToClipboard title="Copy Label" content={label} />}
                      <Action.OpenWith path={filePath} />
                      <Action.ShowInFinder path={filePath} />
                      <Action.Trash title="Move the Whole File to Trash" paths={filePath} />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
