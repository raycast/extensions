import {Color, MenuBarExtra, open} from "@raycast/api";
import usePulls from "./hooks/usePulls";

const actionablePullRequests = () => {
  const {
    isLoading,

    updatedPulls,
    recentlyVisitedPulls,

    visitPull,
  } = usePulls();

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={{source: "icon.png", tintColor: updatedPulls.length === 0 ? Color.Green : Color.Yellow}}
      title={updatedPulls.length > 0 ? `${updatedPulls.length} PR${updatedPulls.length > 1 ? "s": ""} to check` : "All good"}
    >
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
export default actionablePullRequests;
