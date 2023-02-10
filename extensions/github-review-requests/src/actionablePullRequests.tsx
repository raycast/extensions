import { Color, MenuBarExtra, open } from "@raycast/api";
import usePulls from "./hooks/usePulls";
import PullRequestItem from "./components/PullRequestItem";
import { PullRequestShort } from "./types";

const actionablePullRequests = () => {
  const { isLoading, login, updatedPulls, recentlyVisitedPulls, Refresh, visitPull } = usePulls();

  const title = getTitle(updatedPulls);
  const icon = getIcon(updatedPulls);

  const showSeparator = updatedPulls.length > 0 && recentlyVisitedPulls.length > 0;
  const forceRefreshSeparator = updatedPulls.length > 0 || recentlyVisitedPulls.length > 0;

  return (
    <MenuBarExtra isLoading={isLoading} icon={icon} title={title}>
      {updatedPulls.length > 0 &&
        updatedPulls.map((pull, index) => (
          <PullRequestItem
            key={pull.id}
            pull={pull}
            index={index}
            showMyIcon
            onAction={() => open(pull.url).then(() => visitPull(login, pull))}
          />
        ))}

      {updatedPulls.length === 0 && recentlyVisitedPulls.length === 0 && !isLoading && (
        <MenuBarExtra.Item title={`No updated pulls at this time`} />
      )}

      {showSeparator && <MenuBarExtra.Separator />}

      {recentlyVisitedPulls.length > 0 && (
        <MenuBarExtra.Submenu title="Recently Visited">
          {recentlyVisitedPulls.map(pull => (
            <PullRequestItem key={pull.id} pull={pull} onAction={() => open(pull.url)} />
          ))}
        </MenuBarExtra.Submenu>
      )}

      {forceRefreshSeparator && <MenuBarExtra.Separator />}

      <Refresh />
    </MenuBarExtra>
  );
};

// noinspection JSUnusedGlobalSymbols
export default actionablePullRequests;

const getTitle = (updatedPulls: PullRequestShort[]) =>
  updatedPulls.length > 0 ? `${updatedPulls.length} PR${updatedPulls.length > 1 ? "s" : ""}` : undefined;

const getIcon = (updatedPulls: PullRequestShort[]) => ({
  source: "icon.png",
  tintColor: getTintColor(updatedPulls),
});

const getTintColor = (updatedPulls: PullRequestShort[]) => (updatedPulls.length === 0 ? Color.Green : Color.Yellow);
