import { Clipboard, closeMainWindow, Icon, showToast, Toast } from "@raycast/api";
import ActionWithReprompt from "~/components/actions/ActionWithReprompt";
import { useBitwarden } from "~/context/bitwarden";
import { useSession } from "~/context/session";
import { Item, Reprompt } from "~/types/search";

export type CopyTotpActionProps = {
  item: Item;
};

function CopyTotpAction(props: CopyTotpActionProps) {
  const { item } = props;
  const bitwarden = useBitwarden();
  const session = useSession();
  const code = item?.login?.totp;

  if (!code) return null;

  const copyTotp = async () => {
    if (session.token) {
      const toast = await showToast(Toast.Style.Success, "Copying TOTP Code...");
      const totp = await bitwarden.getTotp(code, session.token);
      await Clipboard.copy(totp);
      await toast.hide();
      await closeMainWindow({ clearRootSearch: true });
    } else {
      showToast(Toast.Style.Failure, "Failed to fetch TOTP.");
    }
  };

  return (
    <ActionWithReprompt
      itemId={item.id}
      shortcut={{ modifiers: ["cmd"], key: "t" }}
      title="Copy TOTP"
      icon={Icon.Clipboard}
      onAction={copyTotp}
      reprompt={item.reprompt === Reprompt.REQUIRED}
      repromptDescription={`Copying the TOTP code of <${item.name}>`}
    />
  );
}

export default CopyTotpAction;
