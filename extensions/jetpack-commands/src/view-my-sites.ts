import noViewCommandHandler from "./no-view-command-handler";

export default async function viewMySites() {
  return noViewCommandHandler({ name: "viewMySites" });
}
