import { open, updateCommandMetadata } from "@raycast/api";

// Leaving the commands as is, in case raycast updates updateCommandMetadata to accept
// other properties in the future
const COMMANDS = [
  {
    name: "addNewSite",
    label: "Add a new site",
    content: "Create a new site on WordPress.com",
    callback: async () => {
      await open("https://wordpress.com/start?ref=jetpack-commands");
    },
  },
  {
    name: "importSite",
    label: "Import site",
    content: "Migrate an existing WordPress site to WordPress.com",
    callback: async () => {
      await open("https://wordpress.com/start/import?ref=jetpack-commands");
    },
  },
  {
    name: "addJetpack",
    label: "Add Jetpack To Self-Hosted Site",
    content: "Connect Jetpack to a self-hosted WordPress site",
    callback: async () => {
      await open("https://wordpress.com/jetpack/connect?cta_from=jetpack-commands");
    },
  },
  {
    name: "openReader",
    label: "Open reader",
    content: "Discover new blogs and keep up with the latest posts from sites you follow",
    callback: async () => {
      await open("https://wordpress.com/read");
    },
  },
  {
    name: "openMyProfile",
    label: "Open my profile",
    content: "Access your personal profile on WordPress.com",
    callback: async () => {
      await open("https://wordpress.com/me");
    },
  },
  {
    name: "openAccountSettings",
    label: "Open account settings",
    content: "Adjust your account preferences and settings",
    callback: async () => {
      await open("https://wordpress.com/me/account");
    },
  },
  {
    name: "viewMyPurchases",
    label: "View my purchases",
    content: "Review and manage your WordPress.com purchases",
    callback: async () => {
      await open("https://wordpress.com/me/purchases");
    },
  },
  {
    name: "viewMySites",
    label: "View my sites",
    content: "Review and manage your Jetpack-connected WordPress sites",
    callback: async () => {
      await open("https://wordpress.com/sites");
    },
  },
  {
    name: "manageDomains",
    label: "Manage domains",
    content: "Manage and configure your domains on WordPress.com",
    callback: async () => {
      await open("https://wordpress.com/me/purchases/domains");
    },
  },
  {
    name: "registerDomain",
    label: "Register domain",
    content: "Register a new domain on WordPress.com",
    callback: async () => {
      await open("https://wordpress.com/start/domains/domain-only?ref=jetpack-commands");
    },
  },
];

const noViewCommandHandler = async ({ name }: { name: string }) => {
  const command = COMMANDS.find((command) => command.name === name);
  if (!command) return;
  await updateCommandMetadata({ subtitle: command.content });
  await command.callback();
};

export default noViewCommandHandler;
