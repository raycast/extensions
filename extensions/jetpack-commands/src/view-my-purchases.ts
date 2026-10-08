import noViewCommandHandler from "./no-view-command-handler";

export default async function openMyPurchases() {
  return noViewCommandHandler({ name: "viewMyPurchases" });
}
