import { useFetch } from "@raycast/utils";
import { List, ActionPanel, Action, Image } from "@raycast/api";
import * as cheerio from "cheerio";
import { useState, useEffect } from "react";
import DetailView from "./DetailView";

// SETTINGS
const index_url = "https://valheim.fandom.com/wiki/Valheim_Wiki";
const root_url = "https://valheim.fandom.com";

// INTERFACES
interface Topic {
  name: string;
  link: string;
  key: string;
  category?: string;
}

interface Category {
  name: string;
  key: string;
}

// CATEGORY DROPDOWN FUNCTION
function CategoryDropdown(props: { categories: Category[]; onCategoryChange: (newValue: string) => void }) {
  const { categories, onCategoryChange } = props;

  return (
    <List.Dropdown
      tooltip="Select Category"
      storeValue={true}
      onChange={(newValue) => {
        onCategoryChange(newValue);
      }}
    >
      <List.Dropdown.Item key="all" title="All" value="-all-" />
      <List.Dropdown.Section title="Select item category...">
        {categories.map((category) => (
          <List.Dropdown.Item key={category.key} title={category.name} value={category.key} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

// MAIN FUNCTION
export default function Command() {
  const { isLoading, data } = useFetch(index_url);
  const htmlString = String(data);
  const $ = cheerio.load(htmlString);

  const allCategories: Category[] = [];
  const allTopics: Topic[] = [];

  // find all categories
  const $categories = $("table.navbox");

  // loop through all categories
  $categories.map((index, value) => {
    // replace line breaks with spaces
    $("th.navbox-group > br").replaceWith(" ");

    // get category title and key
    const categoryTitle = $(value).find(".navbox-title-pad").text();
    const categoryKey = categoryTitle.toLowerCase().replaceAll(" ", "_");

    // add category to allCategories array
    allCategories.push({
      name: categoryTitle,
      key: categoryKey,
    });

    // get all links in category
    const $links = $(value).find('.hlist > a[href^="/wiki/"]');

    // save all topics from links to array
    $links.map((index, tvalue) => {
      // get href, name and key
      const href = $(tvalue).attr("href");
      const name = $(tvalue).text();
      const key = href?.replace("/wiki/", "").toLowerCase() ?? "";

      // check if link is not a category
      const isNotCategory = href?.includes(":") === false;
      // check if topic is already listed
      const isAlreadyListed = allTopics.find((item) => item.name.toLowerCase() === name.toLowerCase());

      // add topic to allTopics array
      if (isNotCategory && !isAlreadyListed) {
        allTopics.push({
          name: name,
          link: `${root_url}${href}`,
          key: key,
          category: categoryKey,
        });
      }
    });
  });

  // create states for search and filtered list
  const [searchText, setSearchText] = useState("");
  const [filteredList, filterList] = useState(allTopics);
  const [categories] = useState<Category[]>(allCategories);
  const [selectedCategory, setSelectedCategory] = useState("-all-");

  // filter conditions
  function isNameEqualSearchText(item: Topic) {
    return item.name.toLowerCase().includes(searchText.toLowerCase());
  }

  function isFromSelectedCategory(item: Topic, categoryValue: string) {
    return item.category?.toLowerCase().includes(categoryValue.toLowerCase());
  }

  // filter Topics Array based on search text and selected category
  function filterTopics(categoryString: string) {
    if (categoryString === "-all-") {
      filterList(allTopics.filter((item) => isNameEqualSearchText(item)));
    } else {
      filterList(
        allTopics.filter((item) => isFromSelectedCategory(item, categoryString) && isNameEqualSearchText(item)),
      );
    }
  }

  // filter list when search text changes
  useEffect(() => {
    filterTopics(selectedCategory);
  }, [searchText]);

  // filter list when category dropdown changes
  const onCategoryChange = (newValue: string) => {
    setSelectedCategory(newValue);
    filterTopics(newValue);
  };

  // render list
  return (
    <List
      isShowingDetail
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarAccessory={<CategoryDropdown categories={categories} onCategoryChange={onCategoryChange} />}
      navigationTitle="Search Valheim Wiki"
    >
      {categories.map((categoryItem) => (
        <List.Section title={categoryItem.name} key={categoryItem.key}>
          {filteredList
            .filter((elem) => elem.category == categoryItem.key)
            .map((item) => (
              <List.Item
                key={item.link}
                title={item.name}
                icon={{
                  source: item.key + ".png",
                  mask: Image.Mask.Circle,
                }}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser url={item.link} />
                  </ActionPanel>
                }
                detail={<DetailView link={item.link} />}
              />
            ))}
        </List.Section>
      ))}
    </List>
  );
}
