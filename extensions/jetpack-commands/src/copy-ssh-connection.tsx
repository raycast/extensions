import { Clipboard, showToast, Toast } from "@raycast/api";
import { SiteExcerptData } from "./helpers/site-types";
import { fetchSSHUser } from "./api/ssh";
import ViewCommandHandler, { generateRootCommand } from "./components/CommandHandler";
import { SiteFunctionOnClickProps } from "./hooks/useCommandPallette";

const siteFunctions = {
  onClick: async ({ site }: SiteFunctionOnClickProps) => {
    const toast = await showToast({ title: "Copying SSH connection string…", style: Toast.Style.Animated });
    const sshUser = await fetchSSHUser(site.ID);
    if (!sshUser?.username) {
      toast.title = "Copy SSH connection failed. No SSH user found.";
      toast.style = Toast.Style.Failure;
      return;
    }
    await Clipboard.copy(`ssh ${sshUser.username}@sftp.wp.com`);
    toast.title = "Copied SSH connection string.";
    toast.style = Toast.Style.Success;
  },
  filter: (site: SiteExcerptData) => site?.is_wpcom_atomic,
  loadingContext: true,
};

export default function Command() {
  return <ViewCommandHandler commands={generateRootCommand(siteFunctions)}></ViewCommandHandler>;
}
