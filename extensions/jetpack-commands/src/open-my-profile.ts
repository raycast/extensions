import noViewCommandHandler from "./no-view-command-handler";

export default async function openMyProfile() {
  return noViewCommandHandler({ name: "openMyProfile" });
}
