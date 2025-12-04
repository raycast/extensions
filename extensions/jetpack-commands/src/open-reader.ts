import noViewCommandHandler from "./no-view-command-handler";

export default async function openReader() {
  return noViewCommandHandler({ name: "openReader" });
}
