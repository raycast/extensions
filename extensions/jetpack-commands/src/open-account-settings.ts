import noViewCommandHandler from "./no-view-command-handler";

export default async function openAccountSettings() {
  return noViewCommandHandler({ name: "openAccountSettings" });
}
