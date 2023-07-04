import { WebhookClient, EmbedBuilder } from "discord.js";
import path from "path";
import fs from "fs";
import { environment } from "@raycast/api";

const csvFilePath = path.join(environment.supportPath, "webhookdis.csv");

function extractWebhookInfo(webhookUrl: string) {
  const [, webhookId, webhookToken] = webhookUrl.match(/\/webhooks\/(\d+)\/([\w-]+)/) || [];
  return { webhookId, webhookToken };
}

export async function sendMessageToWebhook(webhookUrl: string, messageContent: string, time: number) {
  const currentTime = `${Math.round(new Date().getTime() / 1000)}`;
  const { webhookId, webhookToken } = extractWebhookInfo(webhookUrl);

  const webhookClient = new WebhookClient({ id: webhookId, token: webhookToken });

  try {
    const data = fs.readFileSync(csvFilePath, "utf8");
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
    checktimes();
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
      fs.appendFileSync(csvFilePath, `${message.id},${time}\n`);
      checktimes();
    })
    .catch((error: string) => {
      console.error(`Failed to send message: ${error}`);
      checktimes();
    });
  checktimes();

  async function checktimes() {
    try {
      const csvFilePath = path.join(environment.supportPath, "webhookdis.csv");
      const data = fs.readFileSync(csvFilePath, "utf8");
      const rows = data.trim().split("\n");

      for (const row of rows) {
        const fields = row.trim().split(",");

        if (fields[1] < currentTime) {
          // Reminder has expired, delete this row from the CSV file
          const expembed = new EmbedBuilder().setTitle("Reminder Expired").setColor(0xd8696f).setFields();
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
