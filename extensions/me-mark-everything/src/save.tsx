/** Save command adapted from raindrop-io save_browser_tab.tsx (MIT, 4cd99da7). */
import { LaunchProps } from "@raycast/api";
import { BookmarkForm } from "./components/BookmarkForm";
import { useCurrentPage } from "./hooks/useCurrentPage";

import { ShortcutSettingsGate } from "./shortcut-settings";

export default function Save(props: LaunchProps<{ arguments: Arguments.Save }>) {
  return (
    <ShortcutSettingsGate>
      <SaveBookmark {...props} />
    </ShortcutSettingsGate>
  );
}

function SaveBookmark(props: LaunchProps<{ arguments: Arguments.Save }>) {
  const argument = props.arguments.url?.trim();
  const { isLoading, page } = useCurrentPage(!argument);
  return (
    <BookmarkForm
      isLoading={isLoading}
      defaultLink={argument || page?.url}
      defaultValues={page?.title ? { title: page.title } : undefined}
    />
  );
}
