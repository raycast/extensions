import { WebhookClient, EmbedBuilder } from "discord.js";
import path from "path";
import fs from "fs";
import { environment } from "@raycast/api";

const csvFilePath = path.join(environment.supportPath, "webhookdis.csv");
if (!fs.existsSync(csvFilePath)) {
  fs.writeFileSync(csvFilePath, "");
  console.log(`File ${csvFilePath} created successfully.`);
} else {
  console.log("Discord Webhook File Exists Already");
  fs.writeFileSync(csvFilePath, "\n\n", { flag: "a" });
}

function extractWebhookInfo(webhookUrl: string) {
  const [, webhookId, webhookToken] = webhookUrl.match(/\/webhooks\/(\d+)\/([\w-]+)/) || [];
  return { webhookId, webhookToken };
}

export async function sendMessageToWebhook(webhookUrl: string, messageContent: string, time: number) {
  const currentTime = `${Math.round(new Date().getTime() / 1000)}`;
  const { webhookId, webhookToken } = extractWebhookInfo(webhookUrl);

  const webhookClient = new WebhookClient({ id: webhookId, token: webhookToken });
  checktimes();
  try {
    const data = fs.readFileSync(csvFilePath).toString();
    const rows = data.trim().split("\n");

    for (const row of rows) {
      const fields = row.trim().split(",");
      if (`${fields[1]}` === `${time}`) {
        checktimes();
        return;
      }
    }
  } catch (error) {
    console.error("Error reading CSV file:", error);
  }

  const embed = new EmbedBuilder()
    .setTitle("Reminder Expires Shortly")
    .setColor(0x86db98)
    .addFields(
      { name: "Your reminder for:", value: `\`\`\`${messageContent}\`\`\``, inline: false },
      { name: `Ends:`, value: `<t:${time}:R>`, inline: false }
    )
    .setFooter({ text: "This message will self destruct upon expiry" });

  webhookClient
    .send({
      username: "Remember This Reminders",
      avatarURL: "https://i.imgur.com/lFhK9Ys.png",
      embeds: [embed],
    })
    .then((message) => {
      fs.appendFileSync(csvFilePath, `\n${message.id},${time}\n`);
      checktimes();
    })
    .catch((error: string) => {
      console.log(`Failed to send message: ${error}`);
    });

  async function checktimes() {
    try {
      const csvFilePath = path.join(environment.supportPath, "webhookdis.csv");
      const data = fs.readFileSync(csvFilePath, "utf8");
      const rows = data.trim().split("\n");

      const expiredRows = [];
      for (const row of rows) {
        const fields = row.trim().split(",");
        if (fields.length !== 2) {
          continue;
        }

        if (fields[1] < currentTime) {
          expiredRows.push(rows.indexOf(row));
        }
      }

      for (const rowIndex of expiredRows) {
        rows.splice(rowIndex, 1);
      }
      fs.writeFileSync(csvFilePath, rows.join("\n"), { mode: 0o777 });
    } catch (error) {
      console.error("Error reading or writing CSV file:", error);
    }
  }
}
