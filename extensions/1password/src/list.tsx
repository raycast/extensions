import { ActionPanel, Detail, environment, Icon, List, popToRoot, showToast, Action, Toast } from "@raycast/api";
import fg from "fast-glob";
import fs from "fs";
import OnePasswordMetaItem from "./OnePasswordMetaItem.dto";
import { useEffect, useState } from "react";
import OnePasswordMetaItemsCategory from "./OnePasswordMetaItemsCategory.dto";
import onePassword from "./onePassword";

const CACHE_DIR = environment.supportPath;
const CACHE_FILE = `${CACHE_DIR}/cache.json`;

type ActionProps = {
  onePasswordMetaItem: OnePasswordMetaItem;
};

async function getPasswords(): Promise<OnePasswordMetaItem[] | void> {
  if (fs.existsSync(onePassword.metadataFolder)) {
    try {
      const cache = getCache();

      if (Array.isArray(cache)) {
        return Promise.resolve(cache);
      } else {
        const metaItems = await fg([`${onePassword.metadataFolder}/**/*.onepassword-item-metadata`], {
          onlyFiles: true,
          deep: 2,
        });
        const onePasswordMetaItems = metaItems
          .map((file) => new OnePasswordMetaItem(JSON.parse(fs.readFileSync(file, "utf-8").toString())))
          .sort((first, second) => first.itemTitle.localeCompare(second.itemTitle));

        setCache(onePasswordMetaItems);
        return Promise.resolve(onePasswordMetaItems);
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Could not read 1Password database",
      });
      return Promise.resolve([]);
    }
  }
}

// Main command

export default function Command() {
  const [onePasswordMetaItems, setOnePasswordMetaItems] = useState<OnePasswordMetaItem[]>();

  useEffect(() => {
    getPasswords().then((value) => setOnePasswordMetaItems(value as OnePasswordMetaItem[]));
  }, [setOnePasswordMetaItems]);

  return fs.existsSync(onePassword.metadataFolder) ? (
    <PasswordList onePasswordMetaItems={onePasswordMetaItems} />
  ) : (
    <Detail markdown={onePassword.installationGuide} />
  );
}

function PasswordList({ onePasswordMetaItems }: { onePasswordMetaItems: OnePasswordMetaItem[] | undefined }) {
  interface OnePasswordMetaItemCategories {
    [key: string]: OnePasswordMetaItemsCategory;
  }

  const categories: OnePasswordMetaItemCategories = {};

  onePasswordMetaItems?.forEach((onePasswordMetaItem) => {
    if (!categories[onePasswordMetaItem.categoryPluralName]) {
      categories[onePasswordMetaItem.categoryPluralName] = {
        categoryPluralName: onePasswordMetaItem.categoryPluralName,
        categoryUUID: onePasswordMetaItem.categoryUUID,
        metaItems: [],
      };
    }
    categories[onePasswordMetaItem.categoryPluralName].metaItems.push(onePasswordMetaItem);
  });

  const sortedCategories = Object.values(categories).sort((a, b) => b.metaItems.length - a.metaItems.length);
  return (
    <List searchBarPlaceholder="Filter items by name..." isLoading={onePasswordMetaItems === undefined}>
      {sortedCategories?.map((onePasswordMetaItemsCategory) => (
        <PasswordListCategory
          onePasswordMetaItemsCategory={onePasswordMetaItemsCategory}
          key={onePasswordMetaItemsCategory.categoryUUID + onePasswordMetaItemsCategory.categoryPluralName}
        />
      ))}
    </List>
  );
}

function getIconForCategory(categoryUUID: string) {
  switch (categoryUUID) {
    case "001":
      return "🔐";
    case "002":
      return "💳";
    case "003":
      return "🔏";
    case "004":
      return "🆔";
    case "005":
      return "🗝";
    case "006":
      return "📜";
    default:
      return "🔒";
  }
}

function PasswordListCategory(props: { onePasswordMetaItemsCategory: OnePasswordMetaItemsCategory }) {
  const onePasswordMetaItemsCategory = props.onePasswordMetaItemsCategory;
  return (
    <List.Section
      id={onePasswordMetaItemsCategory.categoryUUID + onePasswordMetaItemsCategory.categoryPluralName}
      title={onePasswordMetaItemsCategory.categoryPluralName}
      subtitle={`${onePasswordMetaItemsCategory.metaItems.length} Items`}
    >
      {onePasswordMetaItemsCategory.metaItems?.map((onePasswordMetaItem, index) => (
        <PasswordListItem
          key={onePasswordMetaItem.uuid + onePasswordMetaItem.vaultUUID + index + Math.random()}
          onePasswordMetaItem={onePasswordMetaItem}
        />
      ))}
    </List.Section>
  );
}

function getItemAccessoryItems(item: OnePasswordMetaItem) {
  const items = [];
  if (item.accountName) {
    items.push({ icon: "👤", text: item.accountName });
  }

  items.push({ icon: "🗄", text: item.vaultName });
  return items;
}

function PasswordListItem(props: { onePasswordMetaItem: OnePasswordMetaItem }) {
  const onePasswordMetaItem = props.onePasswordMetaItem;
  let subtitle = onePasswordMetaItem.categorySingularName.toLowerCase();
  subtitle = subtitle.charAt(0).toUpperCase() + subtitle.slice(1);

  return (
    <List.Item
      title={onePasswordMetaItem.itemTitle}
      subtitle={subtitle}
      icon={getIconForCategory(onePasswordMetaItem.categoryUUID)}
      accessories={getItemAccessoryItems(onePasswordMetaItem)}
      actions={
        <ActionPanel>
          {onePasswordMetaItem.categoryUUID === "001" && (
            <OpenAndFillAction onePasswordMetaItem={onePasswordMetaItem} />
          )}
          <ViewAction onePasswordMetaItem={onePasswordMetaItem} />
          <EditAction onePasswordMetaItem={onePasswordMetaItem} />
        </ActionPanel>
      }
    />
  );
}

// Actions

const OpenAndFillAction = ({ onePasswordMetaItem }: ActionProps) => {
  return onePasswordMetaItem.websiteURLs?.length ? (
    <Action
      icon={Icon.Link}
      title="Open and Fill"
      onAction={async () => {
        try {
          await onePassword.openAndFill(onePasswordMetaItem);
          await popToRoot({ clearSearchBar: true });
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed opening and filling item",
            message: error instanceof Error ? error.message : undefined,
          });
        }
      }}
    />
  ) : null;
};

const ViewAction = ({ onePasswordMetaItem }: ActionProps) => {
  return (
    <Action
      icon={Icon.Eye}
      title="View"
      onAction={async () => {
        try {
          await onePassword.view(onePasswordMetaItem);
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed viewing item",
            message: error instanceof Error ? error.message : undefined,
          });
        }
      }}
    />
  );
};

const EditAction = ({ onePasswordMetaItem }: ActionProps) => {
  return (
    <Action
      icon={Icon.Gear}
      title="Edit"
      shortcut={{ modifiers: ["cmd"], key: "e" }}
      onAction={async () => {
        try {
          await onePassword.edit(onePasswordMetaItem);
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed editing item",
            message: error instanceof Error ? error.message : undefined,
          });
        }
      }}
    />
  );
};

// Cache

function setCache(data: OnePasswordMetaItem[], ttl = 300) {
  return fs.existsSync(CACHE_DIR)
    ? fs.writeFileSync(
        CACHE_FILE,
        JSON.stringify({
          timestamp: Date.now() / 1000 + ttl,
          payload: data,
        })
      )
    : fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function getCache(): OnePasswordMetaItem[] | false {
  if (!fs.existsSync(CACHE_FILE)) {
    return false;
  }

  const cache = JSON.parse(fs.readFileSync(CACHE_FILE).toString());

  if (cache.timestamp < Date.now() / 1000) {
    fs.unlinkSync(CACHE_FILE);
    return false;
  }

  return cache.payload;
}
