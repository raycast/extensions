import { Action, ActionPanel, Color, Grid, getPreferenceValues, Icon as RaycastIcon } from "@raycast/api";
import { useState } from "react";
import { createGlobalState } from "react-hooks-global-state";
import { toDataURI, toSvg } from "./utils";
import { iconColorEnum, DataIcon } from "./types";
import { useCachedDataSets } from "./hooks/use-cached-datasets";
import { useCachedListIcons } from "./hooks/use-cached-list-icons";
import { IconActions } from "./components/IconActions";

const { iconColor, customColor } = getPreferenceValues<Preferences>();
const { useGlobalState } = createGlobalState({ page: 0, itemsPerPage: 800 });

function Command() {
  const [page, setPage] = useGlobalState("page");
  const [itemsPerPage] = useGlobalState("itemsPerPage");
  const [activeSetId, setActiveSetId] = useState<string>();

  const { data: sets, isLoading: isSetsLoading } = useCachedDataSets();
  const { data: icons, isLoading: isIconsLoading } = useCachedListIcons(sets.find((set) => set.id == activeSetId));

  const isLoading = isSetsLoading || isIconsLoading;

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
                  <IconActions id={id} setId={activeSetId} svgIcon={svgIcon} dataURIIcon={dataURIIcon}>
                    <NavigationActionSection icons={icons} firstAction="next-page" />
                  </IconActions>
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
  icons: DataIcon[];
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
