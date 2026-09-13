import usePullStore from "./usePullStore";
import { useEffect, useState, useMemo } from "react";
import { getLogin } from "../integration/getLogin";
import { PullRequestShort } from "../types";
import {
  ensureOwnerInScope,
  loadConfig,
  normalizeAuthor,
  ownerScopeTokens,
  watchedScopeTokens,
} from "../attention/lib/config";

const usePulls = () => {
  const { isPullStoreLoading, updatedPulls, recentlyVisitedPulls, visitPull, updatePulls, fetchPulls } = usePullStore();

  const [isRemotePullsLoading, setIsRemotePullsLoading] = useState(true);
  const [login, setLogin] = useState("");
  /** Owners the menu lists a section for, whether or not they returned anything. */
  const [scopeOwners, setScopeOwners] = useState<string[]>([]);

  const openPulls = useMemo(
    () =>
      updatedPulls.map(({ owner, ...rest }) => ({
        owner: owner.login,
        ...rest,
      })),
    [updatedPulls],
  );

  /**
   * `viewerLogin` is passed on the first run because the `login` state hasn't
   * been committed yet; later refreshes read it from state rather than paying
   * for another identity lookup.
   */
  const runPullIteration = (viewerLogin?: string) =>
    Promise.resolve()
      .then(() => console.debug("runPullIteration >>>>>>>>>"))
      .then(() => setIsRemotePullsLoading(true))
      .then(() => loadConfig())
      // Runs on every launch, so your own account reaches the scope even if
      // the settings screen is never opened.
      .then(config => ensureOwnerInScope(config, viewerLogin ?? login))
      .then(config => {
        setScopeOwners(config.activeOrgs);
        const base = ["is:open", "draft:false", "archived:false"];
        const watched = watchedScopeTokens(config, viewerLogin ?? login);
        return fetchPulls(
          [...base, ...ownerScopeTokens(config)],
          watched.length > 0 ? [...base, ...watched] : undefined,
        ).then(pulls => {
          return pulls.filter(
            pull => !config.ignoredAuthors.some(author => normalizeAuthor(author) === normalizeAuthor(pull.user.login)),
          );
        });
      })
      .then((pulls: PullRequestShort[]) => updatePulls(pulls))
      .then(() => console.debug("<<<<<<<<< runPullIteration"))
      .finally(() => setIsRemotePullsLoading(false));

  useEffect(() => {
    // Run effect only after we load from store.
    if (isPullStoreLoading) {
      return;
    }

    Promise.resolve()
      .then(() => console.debug("usePulls: start"))
      .then(() => getLogin())
      .then(viewerLogin => {
        setLogin(viewerLogin);
        return runPullIteration(viewerLogin);
      })
      .catch(console.error)
      .finally(() => console.debug("usePulls: end"));
  }, [isPullStoreLoading]);

  return {
    isLoading: isPullStoreLoading || isRemotePullsLoading,
    login,
    openPulls,
    recentlyVisitedPulls,
    isReady: !isPullStoreLoading,
    scopeOwners,
    visitPull,
    runPullIteration,
  };
};

export default usePulls;
