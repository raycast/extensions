import { List } from "@raycast/api";
import { AbletonLiveProjectListItem } from "./ableton-live-project-list-item.component";
import { useCachedPromise } from "@raycast/utils";
import { AbletonLiveProjectService } from "../services/ableton-live-project.service";
import { AbletonLiveFavoriteProjectService } from "../services/ableton-live-favorite-project.service";
import { AbletonLiveProject } from "../models/ableton-live-project.model";
// searchbar accessory

export function AbletonLiveProjectList(props: {
  navigationTitle?: string;
  searchBarPlaceholder?: string;
  actions?: (abletonLiveProject: AbletonLiveProject) => [JSX.Element];
}): JSX.Element {
  const abletonLiveProjectsState = useCachedPromise(AbletonLiveProjectService.abletonLiveProjects);

  const favoriteAbletonLiveProjectsState = useCachedPromise(AbletonLiveFavoriteProjectService.favorites);

  const favoriteAbletonLiveProjects = abletonLiveProjectsState.data?.filter((abletonLiveProject) =>
    favoriteAbletonLiveProjectsState.data?.includes(abletonLiveProject.filePath)
  );

  const abletonLiveProjects = abletonLiveProjectsState.data?.filter(
    (abletonLiveProject) => !favoriteAbletonLiveProjectsState.data?.includes(abletonLiveProject.filePath)
  );

  return (
    <List
      navigationTitle={props.navigationTitle}
      isLoading={abletonLiveProjectsState.isLoading}
      searchBarPlaceholder={props.searchBarPlaceholder ?? "Search for Ableton Live Projects"}
    >
      <List.Section title="Favorites">
        {favoriteAbletonLiveProjects?.map((abletonLiveProject) => (
          <AbletonLiveProjectListItemContainer
            key={abletonLiveProject.filePath}
            abletonLiveProject={abletonLiveProject}
            isFavorite={true}
            actions={props.actions}
            revalidate={favoriteAbletonLiveProjectsState.revalidate}
          />
        ))}
      </List.Section>

      <List.Section title={favoriteAbletonLiveProjects?.length ? "Recent Projects" : undefined}>
        {abletonLiveProjects?.map((abletonLiveProject) => (
          <AbletonLiveProjectListItemContainer
            key={abletonLiveProject.filePath}
            abletonLiveProject={abletonLiveProject}
            isFavorite={false}
            actions={props.actions}
            revalidate={favoriteAbletonLiveProjectsState.revalidate}
          />
        ))}
      </List.Section>
    </List>
  );
}

function AbletonLiveProjectListItemContainer(props: {
  abletonLiveProject: AbletonLiveProject;
  isFavorite: boolean;
  actions?: (abletonLiveProject: AbletonLiveProject) => [JSX.Element];
  revalidate: () => void;
}): JSX.Element {
  return (
    <AbletonLiveProjectListItem
      project={props.abletonLiveProject}
      isFavorite={props.isFavorite}
      actions={props.actions ? props.actions(props.abletonLiveProject) : undefined}
      onToggleFavoriteAction={async () => {
        if (props.isFavorite) {
          await AbletonLiveFavoriteProjectService.removeFromFavorites(props.abletonLiveProject);
        } else {
          await AbletonLiveFavoriteProjectService.addToFavorites(props.abletonLiveProject);
        }
        props.revalidate();
      }}
    />
  );
}
