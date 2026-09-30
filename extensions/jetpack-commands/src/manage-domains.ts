import noViewCommandHandler from "./no-view-command-handler";

export default async function manageDomains() {
  return noViewCommandHandler({ name: "manageDomains" });
}
