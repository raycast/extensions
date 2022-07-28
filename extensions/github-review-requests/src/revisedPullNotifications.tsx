import {Color, MenuBarExtra, open} from "@raycast/api";
import usePulls2 from "./hooks/usePulls2";

const revisedPullNotifications = () => {
  const {
    isLoading,

    updatedPulls,
    recentlyVisitedPulls,

    visitPull,
  } = usePulls2();

  return (
    <MenuBarExtra isLoading={isLoading} icon={{source: "icon.png", tintColor: Color.Blue}}>
      {updatedPulls.map(pull =>
        <MenuBarExtra.Item
          icon={pull.user.avatarUrl}
          key={pull.id}
          title={pull.title}
          onAction={() => open(pull.url).then(() => visitPull(pull))}
        />
      )}

      {updatedPulls.length > 0 && recentlyVisitedPulls.length > 0 && <MenuBarExtra.Separator />}

      {recentlyVisitedPulls.length > 0 && <MenuBarExtra.Submenu title="Recently Visited">
        {recentlyVisitedPulls.map(pull =>
          <MenuBarExtra.Item
            icon={pull.user.avatarUrl}
            key={pull.id}
            title={pull.title}
            onAction={() => open(pull.url)}
          />
        )}
      </MenuBarExtra.Submenu>}
    </MenuBarExtra>
  )
}

// noinspection JSUnusedGlobalSymbols
export default revisedPullNotifications;
