import { showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { Icon } from "@raycast/api";
import { DevelopmentTool, DrupalWebsite } from "./interface";
import os from "os";

const userInfo = os.userInfo();

export const tools = [
  {
    id: "view_in_browser",
    title: "View in Browser",
    action: (website: DrupalWebsite) =>
      Tool(website, "open $(%TOOL% drush browse)", {
        inprogress: "Getting the Website Url",
        completed: "The website opened in your default browser.",
      }),
    icon: Icon.Window,
  },
  {
    id: "clear_the_cache",
    title: "Clear the Cache",
    action: (website: DrupalWebsite) =>
      Tool(website, "%TOOL% drush cr", { inprogress: "Clearing the Cache", completed: "Cache Cleared" }),
    icon: Icon.Trash,
  },
  {
    id: "reveal_in_finder",
    title: "Reveal in Finder",
    action: (website: DrupalWebsite) =>
      Tool(website, `open ${website.root}`, {
        inprogress: "Preparing to Reveal",
        completed: "The project is revealed in finder.",
      }),
    icon: Icon.Finder,
  },
  {
    id: "one_time_login",
    title: "One Time Login",
    action: (website: DrupalWebsite) =>
      Tool(website, "open $(%TOOL% drush uli)", {
        inprogress: "Getting the authenticated login url",
        completed: "Logged In",
      }),
    icon: Icon.LockUnlocked,
  },
  {
    id: "open_in_visual_studio_code",
    title: "Open in Visual Studio Code",
    action: (website: DrupalWebsite) =>
      Tool(website, `code ${website.root}`, {
        inprogress: "Preparing to Open in Visual Studio Code.",
        completed: "The project opened in Visual Studio Code.",
      }),
    icon: Icon.CodeBlock,
  },
  {
    id: "open_in_php_storm",
    title: "Open in PhpStorm",
    action: (website: DrupalWebsite) =>
      Tool(website, `phpstorm ${website.root}`, {
        inprogress: "Preparing to Open in PhpStorm.",
        completed: "The project opened in PhpStorm.",
      }),
    icon: Icon.CodeBlock,
  },
];

async function Tool(
  drupalWebsite: DrupalWebsite,
  command: string,
  messages: { inprogress: string; completed: string },
) {
  await showToast({
    style: Toast.Style.Animated,
    title: messages.inprogress,
  });

  const developmentTool = (() => {
    switch (drupalWebsite.tool) {
      case DevelopmentTool.DDEV:
        return "ddev";
      case DevelopmentTool.Docksal:
        return "fin";
      case DevelopmentTool.Lando:
        return "lando";
      default:
        return "";
    }
  })();

  command = command.replace("%TOOL%", developmentTool);

  promisify(exec)(command, {
    cwd: drupalWebsite.root,
    env: {
      USER: userInfo.username,
      HOME: userInfo.homedir,
      PATH: "/bin:/usr/bin:/usr/local/bin:/opt/homebrew/bin",
    },
  })
    .then(async () => {
      await showToast({
        style: Toast.Style.Success,
        title: messages.completed,
      });
    })
    .catch(async (e: { stderr: string }) => {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error Occurred",
        message: e.stderr,
      });
    });
}
