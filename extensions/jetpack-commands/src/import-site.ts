import noViewCommandHandler from "./no-view-command-handler";

export default async function importSite() {
  return noViewCommandHandler({ name: "importSite" });
}
