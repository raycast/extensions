import noViewCommandHandler from "./no-view-command-handler";

export default async function addJetpack() {
  return noViewCommandHandler({ name: "addJetpack" });
}
