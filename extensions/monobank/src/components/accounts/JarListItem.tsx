import { List } from "@raycast/api";
import { Jar } from "../../types";
import { formatCurrency, getFlagImage, getItemTitle, getJarAccessories } from "../../utils";
import { PinProps } from "../PinActionsSection";
import JarActions from "./JarActions";
import JarDetail from "./JarDetail";

export default function JarListItem(props: {
  jar: Jar;
  isShowingDetail: boolean;
  pin: PinProps;
  onToggleDetails: () => void;
  onCopyTotal: () => void;
}) {
  const { jar, isShowingDetail, pin, onToggleDetails, onCopyTotal } = props;

  return (
    <List.Item
      id={jar.id}
      icon={getFlagImage(jar.currency.code)}
      title={getItemTitle(jar)}
      subtitle={formatCurrency(jar.balance, jar.currency.code)}
      detail={<JarDetail jar={jar} />}
      accessories={!isShowingDetail ? getJarAccessories(jar) : undefined}
      actions={<JarActions jar={jar} pin={pin} onToggleDetails={onToggleDetails} onCopyTotal={onCopyTotal} />}
    />
  );
}
