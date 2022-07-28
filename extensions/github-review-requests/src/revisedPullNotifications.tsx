import { MenuBarExtra } from "@raycast/api";
import usePulls2 from "./hooks/usePulls2";

const revisedPullNotifications = () => {
  const {isLoading, updatedPulls} = usePulls2();

  return (
    <MenuBarExtra isLoading={isLoading} icon="🤔">
      {updatedPulls.map(pull =>
        <MenuBarExtra.Item key={pull.id} title={pull.title} />
      )}
    </MenuBarExtra>
  )
}

export default revisedPullNotifications;
