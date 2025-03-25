import {
  Action,
  ActionPanel,
  Color,
  Grid,
  Cache,
  getPreferenceValues,
  Icon as RaycastIcon,
  showToast,
  Toast,
  Clipboard,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { createGlobalState } from "react-hooks-global-state";
import Service, { Icon, Set } from "./service";
import { copyToClipboard, toDataURI, toSvg, toURL } from "./utils";
import { iconColorEnum, primaryActionEnum } from "./types/perferenceValues";

const { primaryAction } = getPreferenceValues<{
  primaryAction: primaryActionEnum;
}>();

const { iconColor, customColor } = getPreferenceValues<{ iconColor: iconColorEnum; customColor?: string }>();

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
    const cacheId = "sets";
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
      if (isExpired(time) || !("total" in data)) {
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
  const [page, setPage] = useGlobalState("page");
  const [itemsPerPage] = useGlobalState("itemsPerPage");
  const [activeSetId, setActiveSetId] = useState<string>();
  const { sets, isLoading: isSetsLoading } = useSets();
  const { icons, isLoading: isIconsLoading } = useIcons(sets.find((set) => set.id == activeSetId));

  const isLoading = isSetsLoading || isIconsLoading || icons.length === 0;

  const [filter, setFilter] = useState("");

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
          icons.filter((icon) => icon.id.includes(filter)).length / itemsPerPage,
        )}`}
      >
        {icons
          .filter((icon) => icon.id.includes(filter))
          .slice(itemsPerPage * page, itemsPerPage * (page + 1))
          .map((icon) => {
            const { id, body, width, height } = icon;
            const svgIcon = toSvg(
              body,
              width,
              height,
              iconColor === iconColorEnum.customColor &&
                customColor &&
                /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(customColor)
                ? customColor
                : iconColor,
            );
            const dataURIIcon = toDataURI(svgIcon);

            const paste = <Action.Paste title="Paste Svg String" content={svgIcon} />;
            const copy = <Action.CopyToClipboard title="Copy Svg String" content={svgIcon} />;
            const pasteFile = (
              <Action
                title="Paste Svg File"
                icon={RaycastIcon.Clipboard}
                onAction={async () => {
                  await copyToClipboard(svgIcon, id);
                  const { file } = await Clipboard.read();
                  if (file) {
                    Clipboard.paste({ file: file.replace("file://", "") });
                  }
                }}
              />
            );
            const copyFile = (
              <Action
                title="Copy Svg File"
                icon={RaycastIcon.Clipboard}
                onAction={async () => {
                  await copyToClipboard(svgIcon, id);
                  await showToast({
                    title: "Copied to clipboard",
                    message: "The SVG file has been copied to the clipboard.",
                    style: Toast.Style.Success,
                  });
                }}
              />
            );
            const pasteName = activeSetId && <Action.Paste title="Paste Name" content={`${activeSetId}:${id}`} />;
            const copyName = activeSetId && (
              <Action.CopyToClipboard title="Copy Name" content={`${activeSetId}:${id}`} />
            );
            const copyURL = activeSetId && <Action.CopyToClipboard title="Copy URL" content={toURL(activeSetId, id)} />;
            const copyDataURI = <Action.CopyToClipboard title="Copy Data Uri" content={dataURIIcon} />;
            return (
              <Grid.Item
                content={{
                  source: dataURIIcon,
                  tintColor: body.includes("currentColor")
                    ? Color.PrimaryText // Monochrome icon
                    : null,
                }}
                key={id}
                title={id}
                actions={
                  <ActionPanel>
                    {primaryAction === primaryActionEnum.paste && (
                      <>
                        {paste}
                        {copy}
                        {pasteFile}
                        {copyFile}
                        {pasteName}
                        {copyName}
                        {copyURL}
                        {copyDataURI}
                      </>
                    )}
                    {primaryAction === primaryActionEnum.copy && (
                      <>
                        {copy}
                        {paste}
                        {pasteFile}
                        {copyFile}
                        {pasteName}
                        {copyName}
                        {copyURL}
                        {copyDataURI}
                      </>
                    )}
                    {primaryAction === primaryActionEnum.pasteName && (
                      <>
                        {pasteName}
                        {paste}
                        {copy}
                        {pasteFile}
                        {copyFile}
                        {copyName}
                        {copyURL}
                        {copyDataURI}
                      </>
                    )}
                    {primaryAction === primaryActionEnum.pasteFile && (
                      <>
                        {pasteFile}
                        {paste}
                        {copy}
                        {copyFile}
                        {pasteName}
                        {copyName}
                        {copyURL}
                        {copyDataURI}
                      </>
                    )}
                    {primaryAction === primaryActionEnum.copyFile && (
                      <>
                        {copyFile}
                        {paste}
                        {copy}
                        {pasteFile}
                        {pasteName}
                        {copyName}
                        {copyURL}
                        {copyDataURI}
                      </>
                    )}
                    {primaryAction === primaryActionEnum.copyName && (
                      <>
                        {copyName}
                        {paste}
                        {copy}
                        {pasteFile}
                        {copyFile}
                        {pasteName}
                        {copyURL}
                        {copyDataURI}
                      </>
                    )}
                    {primaryAction === primaryActionEnum.copyURL && (
                      <>
                        {copyURL}
                        {paste}
                        {copy}
                        {pasteFile}
                        {copyFile}
                        {pasteName}
                        {copyName}
                        {copyDataURI}
                      </>
                    )}
                    {primaryAction === primaryActionEnum.copyDataURI && (
                      <>
                        {copyDataURI}
                        {paste}
                        {copy}
                        {pasteFile}
                        {copyFile}
                        {pasteName}
                        {copyName}
                        {copyURL}
                      </>
                    )}
                    <NavigationActionSection icons={icons} firstAction="next-page" />
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
  firstAction?: "next-page" | "previous-page";
}) {
  const [page] = useGlobalState("page");
  const [itemsPerPage] = useGlobalState("itemsPerPage");
  if (icons.length <= itemsPerPage * page) {
    return null;
  }

  const hasPreviousPage = page > 0;
  const totalPages = Math.ceil(icons.length / itemsPerPage) - 1;
  const hasNextPage = page < totalPages;

  return (
    <ActionPanel.Section title="Navigation">
      {firstAction === "next-page" ? (
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
  const [, setPage] = useGlobalState("page");
  return (
    <Action
      icon={RaycastIcon.ArrowLeftCircle}
      title="Go to Previous Page"
      shortcut={{ modifiers: ["cmd"], key: "[" }}
      onAction={() => setPage((p) => Math.max(0, p - 1))}
    />
  );
}

function GoToNextPageAction({ totalPages }: { totalPages: number }) {
  const [, setPage] = useGlobalState("page");
  return (
    <Action
      icon={RaycastIcon.ArrowRightCircle}
      title="Go to Next Page"
      shortcut={{ modifiers: ["cmd"], key: "]" }}
      onAction={() => setPage((p) => Math.min(totalPages, p + 1))}
    />
  );
}

function GoToFirstPageAction() {
  const [, setPage] = useGlobalState("page");
  return (
    <Action
      icon={RaycastIcon.ArrowLeftCircleFilled}
      title="Go to First Page"
      shortcut={{ modifiers: ["cmd", "shift"], key: "[" }}
      onAction={() => setPage(0)}
    />
  );
}

function GoToLastPageAction({ totalPages }: { totalPages: number }) {
  const [, setPage] = useGlobalState("page");
  return (
    <Action
      icon={RaycastIcon.ArrowRightCircleFilled}
      title="Go to Last Page"
      shortcut={{ modifiers: ["cmd", "shift"], key: "]" }}
      onAction={() => setPage(totalPages)}
    />
  );
}
