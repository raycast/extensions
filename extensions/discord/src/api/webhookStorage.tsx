import { showToast, Toast, popToRoot } from "@raycast/api";
import { dataFilePath, WebhookChannelModel } from "../interface/webhookModel";
import fs from "fs";

export function addWebhook(webhook: WebhookChannelModel) {
  console.log(webhook.name.length);

  if (webhook.name.length < 1) {
    showToast({ title: "Channel Name is Required!", style: Toast.Style.Failure });
    return;
  }

  if (!checkLinkValidity(webhook.url)) {
    showToast({
      title: "Invalid Webhook URL",
      message: "Please enter a valid webhook URL",
      style: Toast.Style.Failure,
    });
    return;
  }

  const data = getData();
  // if webhook already exists, don't add it again
  if (data.find((w) => w.name === webhook.name)) {
    showToast({ title: "Webhook already exists", message: "Webhook with that name already exists" });
    return;
  }
  data.push(webhook);
  fs.writeFileSync(dataFilePath, JSON.stringify(data));
  showToast({ title: "Webhook added", message: "Webhook added successfully" });
  popToRoot();
}

export function getWebhooks(): WebhookChannelModel[] {
  return getData();
}

export function removeWebhook(name: string) {
  const data = getData();
  const index = data.findIndex((w) => w.name === name);
  if (index === -1) {
    showToast({ title: "Webhook not found", message: "Webhook with that name not found" });
    return;
  }
  data.splice(index, 1);
  fs.writeFileSync(dataFilePath, JSON.stringify(data));
  showToast({ title: "Webhook removed", message: "Webhook removed successfully" });
}

function getData(): WebhookChannelModel[] {
  // if file doesn't exist, create it
  if (!fs.existsSync(dataFilePath)) {
    fs.writeFileSync(dataFilePath, JSON.stringify([]));
  }
  // read file
  const data = fs.readFileSync(dataFilePath, "utf8");
  const parsedData = JSON.parse(data);
  return parsedData;
}

function checkLinkValidity(link: string) {
  const splitted = link.split("/");
  if (link.length < 10 || !link.startsWith("http") || splitted[splitted.length - 1].length != 68) {
    return false;
  }
  return true;
}
