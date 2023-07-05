import path from "path";
import { MenuBarExtra, environment, LaunchType, launchCommand, Icon, getPreferenceValues } from "@raycast/api";
import * as fs from "fs";
import { sendMessageToWebhook } from "./utils/discordwebhook";
import { WebhookClient, EmbedBuilder } from "discord.js";

const preferences = getPreferenceValues<Preferences>();
const webhookURL = preferences.webhookurl;

const webhookUrl = `${webhookURL}`;

function extractWebhookInfo(webhookUrl: string) {
  const [, webhookId, webhookToken] = webhookUrl.match(/\/webhooks\/(\d+)\/([\w-]+)/) || [];
  return { webhookId, webhookToken };
}

export async function webhookInfo(webhookUrl: string) {
  const { webhookId, webhookToken } = extractWebhookInfo(webhookUrl);

  const webhookClient = new WebhookClient({ id: webhookId, token: webhookToken });
  checktimes();

  async function checktimes() {
    try {
      const currentTime = `${Math.round(new Date().getTime() / 1000)}`;
      const csvFilePath = path.join(environment.supportPath, "webhookdis.csv");
      const data = fs.readFileSync(csvFilePath, "utf8");
      const rows = data.trim().split("\n");

      for (const row of rows) {
        const fields = row.trim().split(",");

        if (fields[1] < currentTime) {
          // Reminder has expired, delete this row from the CSV file
          const expembed = new EmbedBuilder()
            .setTitle("Reminder Expired")
            .setColor(0xd8696f)
            .setFields()
            .addFields({
              name: "Your reminder has expired:",
              value: `Unfortunatley, this reminder has expired!`,
              inline: false,
            });
          await webhookClient.editMessage(`${fields[0]}`, {
            embeds: [expembed],
          });
          const rowIndex = rows.indexOf(row);
          rows.splice(rowIndex, 1);
          fs.writeFileSync(csvFilePath, rows.join("\n"), { mode: 0o777 });
        }
      }
    } catch (error) {
      console.error("Error reading or writing CSV file:", error);
    }
  }
}

webhookInfo(webhookUrl);

const REMEMBERING_FILE = path.join(environment.supportPath, "remembering.csv");

if (!fs.existsSync(REMEMBERING_FILE)) {
  // Create the file
  fs.writeFileSync(REMEMBERING_FILE, "");
}

const sizeValue = preferences.size;

const second = 1000;
const minute = 60 * second;
const hour = 60 * minute;
const day = 24 * hour;
const month = 30 * day;
const year = 365 * day;

function getCountdown(diff: number) {
  if (diff > 10 * year) {
    return "Expired";
  } else if (diff <= 0) {
    return "Expired";
  } else if (diff >= year) {
    const years = Math.floor(diff / year);
    if (years === 1) {
      return `${years} year`;
    } else {
      return `${years} years`;
    }
  } else if (diff >= month) {
    const months = Math.floor(diff / month);
    if (months === 1) {
      return `${months} month`;
    } else {
      return `${months} months`;
    }
  } else if (diff >= day) {
    const days = Math.floor(diff / day);
    if (days === 1) {
      return `${days} day`;
    } else {
      return `${days} days`;
    }
  } else if (diff >= hour) {
    const hours = Math.floor(diff / hour);
    if (hours === 1) {
      return `${hours} hour`;
    } else {
      return `${hours} hours`;
    }
  } else if (diff >= minute) {
    const minutes = Math.floor(diff / minute);
    if (minutes === 1) {
      return `${minutes} minute`;
    } else {
      return `${minutes} minutes`;
    }
  } else {
    const seconds = Math.floor(diff / second);
    return `${seconds} seconds`;
  }
}

export default function Command() {
  const data = fs.readFileSync(REMEMBERING_FILE, "utf8");
  const dates = data
    .split("\n")
    .map((line) => {
      const [dateString, taskname] = line.split(",");
      return { date: new Date(dateString), taskname };
    })
    .filter((date) => date.date > new Date())
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (dates.length === 0) {
    if (sizeValue === "compact") {
      return (
        <MenuBarExtra icon={Icon.Stars} title={``} tooltip="Enjoy the rest of the day off">
          <MenuBarExtra.Item icon={Icon.Stars} title={`Woohoo! You got nothing todo!`} />
          <MenuBarExtra.Item
            icon={Icon.CircleProgress100}
            title="Add an item to be remembered!"
            onAction={() => {
              launchCommand({ name: "index", type: LaunchType.UserInitiated });
            }}
          />
        </MenuBarExtra>
      );
    }
    if (sizeValue === "normal") {
      return (
        <MenuBarExtra icon={Icon.Stars} title={`Woohoo! You got nothing todo!`} tooltip="Enjoy the rest of the day off">
          <MenuBarExtra.Item icon={Icon.Stars} title={`Woohoo! You got nothing todo!`} />
          <MenuBarExtra.Item
            icon={Icon.CircleProgress100}
            title="Add an item to be remembered!"
            onAction={() => {
              launchCommand({ name: "index", type: LaunchType.UserInitiated });
            }}
          />
        </MenuBarExtra>
      );
    }
    if (sizeValue === "large") {
      return (
        <MenuBarExtra icon={Icon.Stars} title={`Woohoo! You got nothing todo!`} tooltip="Enjoy the rest of the day off">
          <MenuBarExtra.Item icon={Icon.Stars} title={`Woohoo! You got nothing todo!`} />
          <MenuBarExtra.Item
            icon={Icon.CircleProgress100}
            title="Add an item to be remembered!"
            onAction={() => {
              launchCommand({ name: "index", type: LaunchType.UserInitiated });
            }}
          />
        </MenuBarExtra>
      );
    }
  }

  const closestDate = dates[0];
  const diff = closestDate.date.getTime() - new Date().getTime();
  const countdown = getCountdown(diff);

  if (countdown === "Forever") {
    if (sizeValue === "compact") {
      return (
        <MenuBarExtra icon={Icon.Stars} title={``} tooltip="Enjoy the rest of the day off">
          <MenuBarExtra.Item icon={Icon.Stars} title={`Woohoo! You got nothing todo!`} />
          <MenuBarExtra.Item
            icon={Icon.CircleProgress100}
            title="Add an item to be remembered!"
            onAction={() => {
              launchCommand({ name: "index", type: LaunchType.UserInitiated });
            }}
          />
        </MenuBarExtra>
      );
    }
    if (sizeValue === "normal") {
      return (
        <MenuBarExtra icon={Icon.Stars} title={`Woohoo! You got nothing todo!`} tooltip="Enjoy the rest of the day off">
          <MenuBarExtra.Item icon={Icon.Stars} title={`Woohoo! You got nothing todo!`} />
          <MenuBarExtra.Item
            icon={Icon.CircleProgress100}
            title="Add an item to be remembered!"
            onAction={() => {
              launchCommand({ name: "index", type: LaunchType.UserInitiated });
            }}
          />
        </MenuBarExtra>
      );
    }
    if (sizeValue === "large") {
      return (
        <MenuBarExtra icon={Icon.Stars} title={`Woohoo! You got nothing todo!`} tooltip="Enjoy the rest of the day off">
          <MenuBarExtra.Item icon={Icon.Stars} title={`Woohoo! You got nothing todo!`} />
          <MenuBarExtra.Item
            icon={Icon.CircleProgress100}
            title="Add an item to be remembered!"
            onAction={() => {
              launchCommand({ name: "index", type: LaunchType.UserInitiated });
            }}
          />
        </MenuBarExtra>
      );
    }
  }

  if (countdown === "Expired") {
    if (sizeValue === "compact") {
      return (
        <MenuBarExtra icon={Icon.Stars} title={``} tooltip="Enjoy the rest of the day off">
          <MenuBarExtra.Item icon={Icon.Stars} title={`Woohoo! You got nothing todo!`} />
          <MenuBarExtra.Item
            icon={Icon.CircleProgress100}
            title="Add an item to be remembered!"
            onAction={() => {
              launchCommand({ name: "index", type: LaunchType.UserInitiated });
            }}
          />
        </MenuBarExtra>
      );
    }
    if (sizeValue === "normal") {
      return (
        <MenuBarExtra icon={Icon.Stars} title={`Woohoo! You got nothing todo!`} tooltip="Enjoy the rest of the day off">
          <MenuBarExtra.Item icon={Icon.Stars} title={`Woohoo! You got nothing todo!`} />
          <MenuBarExtra.Item
            icon={Icon.CircleProgress100}
            title="Add an item to be remembered!"
            onAction={() => {
              launchCommand({ name: "index", type: LaunchType.UserInitiated });
            }}
          />
        </MenuBarExtra>
      );
    }
    if (sizeValue === "large") {
      return (
        <MenuBarExtra icon={Icon.Stars} title={`Woohoo! You got nothing todo!`} tooltip="Enjoy the rest of the day off">
          <MenuBarExtra.Item icon={Icon.Stars} title={`Woohoo! You got nothing todo!`} />
          <MenuBarExtra.Item
            icon={Icon.CircleProgress100}
            title="Add an item to be remembered!"
            onAction={() => {
              launchCommand({ name: "index", type: LaunchType.UserInitiated });
            }}
          />
        </MenuBarExtra>
      );
    }
  }
  const delimiter = "||&|"; // Define the delimiter as a regular expression with the "g" flag
  const taskname = closestDate.taskname.replace(delimiter, ",");
  const messageContent = taskname;
  const timestamp = closestDate.date.toISOString();
  const unixTimestamp = Date.parse(timestamp) / 1000; // Divide by 1000 to convert to seconds
  const roundedts = Math.round(unixTimestamp);

  sendMessageToWebhook(webhookUrl, messageContent, roundedts);

  if (sizeValue === "normal") {
    return (
      <MenuBarExtra icon={Icon.ArrowRight} title={countdown} tooltip={taskname}>
        <MenuBarExtra.Item icon={Icon.ArrowRight} title={`${taskname} - Expires In ${countdown}!`} />
        <MenuBarExtra.Item
          icon={Icon.Document}
          title="View all items being remembered!"
          onAction={() => {
            launchCommand({ name: "view", type: LaunchType.UserInitiated });
          }}
        />
        <MenuBarExtra.Item
          icon={Icon.CircleProgress100}
          title="Add an item to be remembered!"
          onAction={() => {
            launchCommand({ name: "index", type: LaunchType.UserInitiated });
          }}
        />
      </MenuBarExtra>
    );
  }
  if (sizeValue === "large") {
    return (
      <MenuBarExtra icon={Icon.ArrowRight} title={`${taskname} - ${countdown}`} tooltip={taskname}>
        <MenuBarExtra.Item icon={Icon.ArrowRight} title={`${taskname} - Expires In ${countdown}!`} />
        <MenuBarExtra.Item
          icon={Icon.Document}
          title="View all items being remembered!"
          onAction={() => {
            launchCommand({ name: "view", type: LaunchType.UserInitiated });
          }}
        />
        <MenuBarExtra.Item
          icon={Icon.CircleProgress100}
          title="Add an item to be remembered!"
          onAction={() => {
            launchCommand({ name: "index", type: LaunchType.UserInitiated });
          }}
        />
      </MenuBarExtra>
    );
  }
  if (sizeValue === "compact") {
    const formattedCountdown = countdown
      .replace(" seconds", "s")
      .replace(" second", "s")
      .replace(" minutes", "m")
      .replace(" minute", "m")
      .replace(" hours", "h")
      .replace(" hour", "h")
      .replace(" days", "d")
      .replace(" day", "d")
      .replace(" weeks", "w")
      .replace(" week", "w")
      .replace(" months", "m")
      .replace(" month", "m")
      .replace(" years", "y")
      .replace(" year", "y");

    return (
      <MenuBarExtra title={formattedCountdown} tooltip={taskname}>
        <MenuBarExtra.Item icon={Icon.ArrowRight} title={`${taskname} - Expires In ${countdown}!`} />
        <MenuBarExtra.Item
          icon={Icon.Document}
          title="View all items being remembered!"
          onAction={() => {
            launchCommand({ name: "view", type: LaunchType.UserInitiated });
          }}
        />
        <MenuBarExtra.Item
          icon={Icon.CircleProgress100}
          title="Add an item to be remembered!"
          onAction={() => {
            launchCommand({ name: "index", type: LaunchType.UserInitiated });
          }}
        />
      </MenuBarExtra>
    );
  }
}
