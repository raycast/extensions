import { Clipboard, confirmAlert, showToast, Toast } from "@raycast/api";
import { SiteExcerptData } from "./helpers/site-types";
import { fetchSSHUser, resetSSHPassword } from "./api/ssh";
import ViewCommandHandler, { generateRootCommand } from "./components/CommandHandler";
import { SiteFunctionOnClickProps } from "./hooks/useCommandPallette";

const siteFunctions = {
  onClick: async ({ site }: SiteFunctionOnClickProps) => {
    if (await confirmAlert({ title: "Are you sure you want to reset your SSH/SFTP password?" })) {
      const toast = await showToast({ title: "Resetting SSH/SFTP password…", style: Toast.Style.Animated });
      const sshUser = await fetchSSHUser(site.ID);
      if (!sshUser?.username) {
        toast.style = Toast.Style.Failure;
        toast.title = "SSH/SFTP password reset failed. No SSH user found.";
        return;
      }
      const { password } = await resetSSHPassword(site.ID, sshUser);
      if (!password) {
        toast.style = Toast.Style.Failure;
        toast.title = "SSH/SFTP password reset failed.";
        return;
      }
      await Clipboard.copy(password);
      toast.style = Toast.Style.Success;
      toast.title = "SSH/SFTP password reset and copied to clipboard.";
      return;
    }
    await showToast({
      title: "SSH/SFTP password reset cancelled.",
      style: Toast.Style.Failure,
    });
    return;
  },
  filter: (site: SiteExcerptData) => site?.is_wpcom_atomic,
  loadingContext: true,
};

export default function Command() {
  return <ViewCommandHandler commands={generateRootCommand(siteFunctions)}></ViewCommandHandler>;
}
