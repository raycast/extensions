import noViewCommandHandler from "./no-view-command-handler";

export default async function addNewSite() {
  return noViewCommandHandler({ name: "addNewSite" });
}
