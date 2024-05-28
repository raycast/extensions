import {
  Dispatch,
  ReactNode,
  SetStateAction,
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";
import invariant from "tiny-invariant";
import {
  Subscription,
  useEntries,
  useStarredEntriesIds,
  useSubscriptions,
  useUnreadEntriesIds,
} from "./api";

type FeedbinApiContext = {
  subscriptions: ReturnType<typeof useSubscriptions>;
  starredEntriesIds: ReturnType<typeof useStarredEntriesIds>;
  unreadEntriesIds: ReturnType<typeof useUnreadEntriesIds>;
  unreadEntries: ReturnType<typeof useEntries>;
  entries: ReturnType<typeof useEntries>;
  subscriptionMap: Record<number, Subscription>;
  starredEntriesIdsSet: Set<number>;
  unreadEntriesSet: Set<number>;
  isLoading: boolean;
  filterFeedId: number | undefined;
  setFilterFeedId: Dispatch<SetStateAction<number | undefined>>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Context = createContext<FeedbinApiContext>(undefined as any);

export const FeedbinApiContextProvider = (props: {
  children?: ReactNode;
  feedId?: number;
  starred?: boolean;
  parentContext?: FeedbinApiContext;
}) => {
  if (props.parentContext)
    return (
      <Context.Provider value={props.parentContext}>
        {props.children}
      </Context.Provider>
    );

  const [filterFeedId, setFilterFeedId] = useState<number | undefined>(
    props.feedId,
  );

  const starred = props.starred ? true : undefined;
  const subscriptions = useSubscriptions();
  const unreadEntries = useEntries({
    read: false,
    feedId: filterFeedId,
    starred,
  });

  const entries = useEntries({
    feedId: filterFeedId,
    starred,
  });

  const starredEntriesIds = useStarredEntriesIds();
  const unreadEntriesIds = useUnreadEntriesIds();
  const isLoading =
    subscriptions.isLoading ||
    starredEntriesIds.isLoading ||
    unreadEntriesIds.isLoading ||
    unreadEntries.isLoading;

  const subscriptionMap = useMemo(
    () =>
      subscriptions.data
        ? subscriptions.data.reduce<Record<number, Subscription>>(
            (acc, sub) => ({ ...acc, [sub.feed_id]: sub }),
            {},
          )
        : {},
    [subscriptions.data],
  );
  const starredEntriesIdsSet = useMemo(
    () => new Set(starredEntriesIds.data),
    [starredEntriesIds.data],
  );

  const unreadEntriesSet = useMemo(
    () => new Set(unreadEntriesIds.data),
    [unreadEntriesIds.data],
  );

  const api: FeedbinApiContext = {
    subscriptions,
    subscriptionMap,
    unreadEntries,
    starredEntriesIds,
    starredEntriesIdsSet,
    unreadEntriesIds,
    unreadEntriesSet,
    isLoading,
    filterFeedId,
    setFilterFeedId,
    entries,
  };

  return <Context.Provider value={api}>{props.children}</Context.Provider>;
};

export const useFeedbinApiContext = () => {
  const api = useContext(Context);
  invariant(api, "usecontext must be used within a ContextProvider");
  return api;
};
