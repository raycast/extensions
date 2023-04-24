import {
  Action,
  ActionPanel,
  Color,
  Grid,
  Cache,
  getPreferenceValues,
  Icon as RaycastIcon,
} from '@raycast/api';
import { useEffect, useState } from 'react';
import { createGlobalState } from 'react-hooks-global-state';
import Service, { Icon, Set } from './service';
import { toDataURI, toSvg, toURL } from './utils';

const { primaryAction } =
  getPreferenceValues<{ primaryAction: 'paste' | 'copy' }>();

const service = new Service();
const cache = new Cache({
  capacity: 50 * 1e6,
});

const day = 24 * 60 * 60 * 1e3;
const isExpired = (time: number) => Date.now() - time > day;

const { useGlobalState } = createGlobalState({ page: 0, itemsPerPage: 800 });

const useSets = () => {
  const [state, setState] = useState<{ isLoading: boolean; sets: Set[] }>({
    isLoading: true,
    sets: [],
  });
  useEffect(() => {
    setState((p) => ({ ...p, isLoading: true }));
    const cacheId = 'sets';
    async function fetchSets() {
      const sets = await service.listSets();
      cache.set(cacheId, JSON.stringify({ time: Date.now(), data: sets }));
      setState({ isLoading: false, sets });
    }

    const cached = cache.get(cacheId);
    if (!cached) {
      fetchSets();
      return;
    }
    try {
      const { time, data }: { time: number; data: Set[] } = JSON.parse(cached);
      if (isExpired(time) || !('total' in data)) {
        fetchSets();
        return;
      }
      setState({ isLoading: false, sets: data });
    } catch (e) {
      console.log("Couldn't parse cache: ", e);
      fetchSets();
    }
  }, []);
  return state;
};

const useIcons = (set?: Set) => {
  const [state, setState] = useState<{ isLoading: boolean; icons: Icon[] }>({
    isLoading: true,
    icons: [],
  });
  useEffect(() => {
    if (!set) {
      setState((p) => ({ ...p, isLoading: false }));
      return;
    }
    setState((p) => ({ ...p, isLoading: true }));
    const cacheId = `set-${set.id}`;
    async function fetchIcons() {
      if (!set) {
        setState({ isLoading: false, icons: [] });
        return;
      }
      const icons = await service.listIcons(set.id, set.name);
      cache.set(cacheId, JSON.stringify({ time: Date.now(), data: icons }));
      setState({ isLoading: false, icons });
    }

    const cached = cache.get(cacheId);
    if (!cached) {
      fetchIcons();
      return;
    }

    try {
      const { time, data }: { time: number; data: Icon[] } = JSON.parse(cached);
      if (isExpired(time)) {
        fetchIcons();
        return;
      }
      setState({ isLoading: false, icons: data });
    } catch (e) {
      console.log("Couldn't parse cache: ", e);
      fetchIcons();
    }
  }, [set]);
  return state;
};

function Command() {
  const [page, setPage] = useGlobalState('page');
  const [itemsPerPage] = useGlobalState('itemsPerPage');
  const [activeSetId, setActiveSetId] = useState<string>();
  const { sets, isLoading: isSetsLoading } = useSets();
  const { icons, isLoading: isIconsLoading } = useIcons(
    sets.find((set) => set.id == activeSetId),
  );

  const isLoading = isSetsLoading || isIconsLoading || icons.length === 0;

  const [filter, setFilter] = useState('');

  return (
    <Grid
      columns={8}
      inset={Grid.Inset.Medium}
      isLoading={isLoading}
      onSearchTextChange={(query) => {
        setPage(0);
        setFilter(query);
      }}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Select Icon Set"
          storeValue={true}
          onChange={(activeSetId) => {
            setPage(0);
            setActiveSetId(activeSetId);
          }}
        >
          {sets.map((set) => (
            <Grid.Dropdown.Item key={set.id} title={set.name} value={set.id} />
          ))}
        </Grid.Dropdown>
      }
    >
      <Grid.Section
        title={`Page ${page + 1} of ${Math.ceil(
          icons.filter((icon) => icon.id.includes(filter)).length /
            itemsPerPage,
        )}`}
      >
        {icons
          .filter((icon) => icon.id.includes(filter))
          .slice(itemsPerPage * page, itemsPerPage * (page + 1))
          .map((icon) => {
            const { id, body, width, height } = icon;
            const svgIcon = toSvg(body, width, height);
            const dataURIIcon = toDataURI(svgIcon);

            const paste = <Action.Paste title="Paste SVG" content={svgIcon} />;
            const copy = (
              <Action.CopyToClipboard title="Copy SVG" content={svgIcon} />
            );
            return (
              <Grid.Item
                content={{
                  source: dataURIIcon,
                  tintColor: body.includes('currentColor')
                    ? Color.PrimaryText // Monochrome icon
                    : null,
                }}
                key={id}
                title={id}
                actions={
                  <ActionPanel>
                    {primaryAction === 'paste' ? (
                      <>
                        {paste}
                        {copy}
                      </>
                    ) : (
                      <>
                        {copy}
                        {paste}
                      </>
                    )}
                    {activeSetId && (
                      <>
                        <Action.CopyToClipboard
                          title="Copy Name"
                          content={`${activeSetId}:${id}`}
                        />
                        <Action.CopyToClipboard
                          title="Copy URL"
                          content={toURL(activeSetId, id)}
                        />
                      </>
                    )}
                    <NavigationActionSection
                      icons={icons}
                      firstAction="next-page"
                    />
                  </ActionPanel>
                }
              />
            );
          })}
      </Grid.Section>
    </Grid>
  );
}

export default Command;

function NavigationActionSection({
  icons,
  firstAction,
}: {
  icons: Icon[];
  firstAction?: 'next-page' | 'previous-page';
}) {
  const [page] = useGlobalState('page');
  const [itemsPerPage] = useGlobalState('itemsPerPage');
  if (icons.length <= itemsPerPage * page) {
    return null;
  }

  const hasPreviousPage = page > 0;
  const totalPages = Math.ceil(icons.length / itemsPerPage) - 1;
  const hasNextPage = page < totalPages;

  return (
    <ActionPanel.Section title="Navigation">
      {firstAction === 'next-page' ? (
        <>
          {hasNextPage && <GoToNextPageAction totalPages={totalPages} />}
          {hasPreviousPage && <GoToPreviousPageAction />}
        </>
      ) : (
        <>
          {hasPreviousPage && <GoToPreviousPageAction />}
          {hasNextPage && <GoToNextPageAction totalPages={totalPages} />}
        </>
      )}
      {page < totalPages && <GoToLastPageAction totalPages={totalPages} />}
      {page !== 0 && <GoToFirstPageAction />}
    </ActionPanel.Section>
  );
}

function GoToPreviousPageAction() {
  const [, setPage] = useGlobalState('page');
  return (
    <Action
      icon={RaycastIcon.ArrowLeftCircle}
      title="Go to Previous Page"
      shortcut={{ modifiers: ['cmd'], key: '[' }}
      onAction={() => setPage((p) => Math.max(0, p - 1))}
    />
  );
}

function GoToNextPageAction({ totalPages }: { totalPages: number }) {
  const [, setPage] = useGlobalState('page');
  return (
    <Action
      icon={RaycastIcon.ArrowRightCircle}
      title="Go to Next Page"
      shortcut={{ modifiers: ['cmd'], key: ']' }}
      onAction={() => setPage((p) => Math.min(totalPages, p + 1))}
    />
  );
}

function GoToFirstPageAction() {
  const [, setPage] = useGlobalState('page');
  return (
    <Action
      icon={RaycastIcon.ArrowLeftCircleFilled}
      title="Go to First Page"
      shortcut={{ modifiers: ['cmd', 'shift'], key: '[' }}
      onAction={() => setPage(0)}
    />
  );
}

function GoToLastPageAction({ totalPages }: { totalPages: number }) {
  const [, setPage] = useGlobalState('page');
  return (
    <Action
      icon={RaycastIcon.ArrowRightCircleFilled}
      title="Go to Last Page"
      shortcut={{ modifiers: ['cmd', 'shift'], key: ']' }}
      onAction={() => setPage(totalPages)}
    />
  );
}
