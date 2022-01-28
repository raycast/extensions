import { ActionPanel, Detail, environment, Icon, List, popToRoot, showHUD, showToast, ToastStyle } from "@raycast/api";
import fg from "fast-glob";
import fs from "fs";
import open from "open";
import os from "os";
import shajs from "sha.js";
import OnePasswordMetaItem from "./OnePasswordMetaItem.dto";
import { useEffect, useState } from "react";
import OnePasswordMetaItemsCategory from "./OnePasswordMetaItemsCategory.dto";

// This is the official location, see for more information https://support.1password.com/integration-mac/
const ONE_PASSWORD_7_CLI_FOLDER = `${os.homedir()}/Library/Containers/com.agilebits.onepassword7/Data/Library/Caches/Metadata/1Password`;
const CACHE_DIR = environment.supportPath;
const CACHE_FILE = `${CACHE_DIR}/cache.json`;
const CLI_REQUIRED_MESSAGE = `
# Spotlight and 3rd party app integrations is not enabled

To use this extension please enable the "Spotlight and 3rd party app integrations" in the 1Password 7 app;
1. Make sure you have the right 1Password app version, it should be 7.
2. Open and unlock 1Password.
3. Choose 1Password > Preferences and click the Advanced icon.
4. Turn on “Enable Spotlight and 3rd party app integrations”.
5. Restart 1Password app.

## This extension has no access to your passwords only to the metadata
The metadata includes the following information about each item:
- title
- description
- URLs
- vault name
- item category
- account name
- vault identifier
- item identifier
`;

type ActionProps = {
  onePasswordMetaItem: OnePasswordMetaItem;
};

async function getPasswords(): Promise<OnePasswordMetaItem[] | void> {
  if (fs.existsSync(ONE_PASSWORD_7_CLI_FOLDER)) {
    try {
      const cache = getCache();

      if (Array.isArray(cache)) {
        return Promise.resolve(cache);
      } else {
        const metaItems = await fg([`${ONE_PASSWORD_7_CLI_FOLDER}/**/*.onepassword-item-metadata`], {
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
      showToast(ToastStyle.Failure, "Error", "Could not read 1Passwords database");
      return Promise.resolve([]);
    }
  }
}

/**
 * Main command
 */
export default function Command() {
  const [onePasswordMetaItems, setOnePasswordMetaItems] = useState<OnePasswordMetaItem[]>();

  useEffect(() => {
    getPasswords().then((value) => setOnePasswordMetaItems(value as OnePasswordMetaItem[]));
  }, [setOnePasswordMetaItems]);

  return fs.existsSync(ONE_PASSWORD_7_CLI_FOLDER) ? (
    <PasswordList onePasswordMetaItems={onePasswordMetaItems} />
  ) : (
    <Detail markdown={CLI_REQUIRED_MESSAGE} />
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
          key={onePasswordMetaItemsCategory.categoryUUID}
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

function getItemAccessoryTitle(item: OnePasswordMetaItem) {
  const vaultName = `🗄 ${item.vaultName}`;
  if (item.accountName) {
    return `👤 ${item.accountName} ${vaultName}`;
  }
  return vaultName;
}

function PasswordListItem(props: { onePasswordMetaItem: OnePasswordMetaItem }) {
  const onePasswordMetaItem = props.onePasswordMetaItem;

  return (
    <List.Item
      title={onePasswordMetaItem.itemTitle}
      subtitle={onePasswordMetaItem.categorySingularName}
      icon={getIconForCategory(onePasswordMetaItem.categoryUUID)}
      accessoryTitle={getItemAccessoryTitle(onePasswordMetaItem)}
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
async function doAction(action: string, onePasswordMetaItem: OnePasswordMetaItem, addHash: boolean, message: string) {
  let url = `onepassword7://${action}/${onePasswordMetaItem.vaultUUID}/${onePasswordMetaItem.uuid}`;

  if (addHash) {
    const hashedUrl = shajs("sha256").update(onePasswordMetaItem.websiteURLs[0]).digest("hex");
    url = url + `/${hashedUrl}`;
  }

  popToRoot({ clearSearchBar: true });

  await open(url, { app: { name: "1Password 7" } });

  showHUD(message);
}

const OpenAndFillAction = ({ onePasswordMetaItem }: ActionProps): JSX.Element => (
  <ActionPanel.Item
    icon={Icon.Link}
    title="Open and Fill"
    onAction={async () => {
      doAction(
        "open_and_fill",
        onePasswordMetaItem,
        true,
        `Opening ${onePasswordMetaItem.itemTitle} in your default browser`
      );
    }}
  />
);

const ViewAction = ({ onePasswordMetaItem }: ActionProps): JSX.Element => (
  <ActionPanel.Item
    icon={Icon.Eye}
    title="View in 1Password"
    shortcut={{ modifiers: ["cmd"], key: "v" }}
    onAction={async () => {
      await doAction("view", onePasswordMetaItem, false, `Opening ${onePasswordMetaItem.itemTitle} in 1Password 7`);
    }}
  />
);

const EditAction = ({ onePasswordMetaItem }: ActionProps): JSX.Element => (
  <ActionPanel.Item
    icon={Icon.Gear}
    title="Edit in 1Password"
    shortcut={{ modifiers: ["cmd"], key: "e" }}
    onAction={async () => {
      await doAction(
        "edit",
        onePasswordMetaItem,
        false,
        `Opening ${onePasswordMetaItem.itemTitle} in your default browser`
      );
    }}
  />
);

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
