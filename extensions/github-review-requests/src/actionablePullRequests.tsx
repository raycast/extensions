import {Color, MenuBarExtra, open} from "@raycast/api";
import usePulls from "./hooks/usePulls";
import PullRequestItem from "./components/PullRequestItem";

const actionablePullRequests = () => {
  const {isLoading, updatedPulls, recentlyVisitedPulls, visitPull} = usePulls();

  const title = updatedPulls.length === 0
    ? `All good`
    : `${updatedPulls.length} PR${updatedPulls.length > 1 ? "s" : ""} to check`;

  const tintColor = updatedPulls.length === 0
    ? Color.Green
    : Color.Yellow;

  const icon = {source: "icon.png", tintColor};

  const showSeparator = updatedPulls.length > 0 && recentlyVisitedPulls.length > 0;

  return (
    <MenuBarExtra isLoading={isLoading} icon={icon} title={title}>
      {updatedPulls.map((pull) => (
        <PullRequestItem
          key={pull.id}
          pull={pull}
          onAction={() => open(pull.url).then(() => visitPull(pull))}
        />
      ))}

      {showSeparator && <MenuBarExtra.Separator/>}

      {recentlyVisitedPulls.length > 0 && (
        <MenuBarExtra.Submenu title="Recently Visited">
          {recentlyVisitedPulls.map((pull) => (
            <PullRequestItem key={pull.id} pull={pull} onAction={() => open(pull.url)}/>
          ))}
        </MenuBarExtra.Submenu>
      )}
    </MenuBarExtra>
  );
};

// noinspection JSUnusedGlobalSymbols
export default actionablePullRequests;
