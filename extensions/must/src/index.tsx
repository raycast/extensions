import React from "react";
import {
  getPreferenceValues,
  ActionPanel,
  showToast,
  ToastStyle,
  List,
  ListItem,
  OpenInBrowserAction,
  CopyToClipboardAction,
  ListSection,
  Icon,
} from "@raycast/api";

// Types
import { Preferences } from "@/types/Preferences";
import { Product } from "@/types/ListResponse";

// Hooks
import useMust from "./hooks/useMust";

const Raycast: React.FC = () => {
  const { username }: Preferences = getPreferenceValues();
  const { isLoading, error, list } = useMust(username);

  if (error !== null) {
    showToast(ToastStyle.Failure, "Something went wrong.", String(error));
  }

  // Render
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search entries...">
      <ListSection title="Series" subtitle={String(list?.series?.length)}>
        {list?.series?.map((show) => (
          <MustListItem key={show.id} item={show} />
        ))}
      </ListSection>

      <ListSection title="Movies" subtitle={String(list?.movies?.length)}>
        {list?.movies?.map((movie) => (
          <MustListItem key={movie.id} item={movie} />
        ))}
      </ListSection>
    </List>
  );
};

const MustListItem: React.FC<{ item: Product }> = ({ item }) => (
  <ListItem
    title={item.title}
    icon={`https://image.tmdb.org/t/p/w342${item.poster_file_path}`}
    accessoryTitle={item.items_count ? `${item.items_count} episodes` : undefined}
    accessoryIcon={item.items_count ? Icon.Calendar : undefined}
    actions={
      <ActionPanel>
        <OpenInBrowserAction url={`https://mustapp.com/p/${item.id}`} title="Open on Must" />
        {item.trailer_url && <OpenInBrowserAction url={item.trailer_url} title="Open Trailer on YouTube" />}

        <CopyToClipboardAction title="Copy Name to Clipboard" content={item.title} />
        <CopyToClipboardAction title="Copy Must URL to Clipboard" content={`https://mustapp.com/p/${item.id}`} />
        {item.trailer_url && <CopyToClipboardAction title="Copy Trailer URL to Clipboard" content={item.trailer_url} />}
      </ActionPanel>
    }
  />
);

export default Raycast;
