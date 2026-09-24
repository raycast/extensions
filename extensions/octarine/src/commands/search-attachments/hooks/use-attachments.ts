import { Toast, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { extensionPreferences } from "@lib/preferences";
import { querySearchText } from "@lib/search";
import type { Workspace } from "@type/octarine";
import { ALL_EXTENSIONS, type IndexedAttachment } from "@type/attachments";
import { getAttachments } from "../lib/attachments";
import { useLoadingToast } from "./use-loading-toast";

export type WorkspaceAttachmentsSection = {
  workspace: Workspace;
  attachments: IndexedAttachment[];
};

type Options = {
  workspaces: Workspace[];
  enabled?: boolean;
  excludedExtensions: Set<string>;
  searchText: string;
  selectedExtension: string;
  refresh?: boolean;
};

type Result = {
  dropdown: string[];
  sections: WorkspaceAttachmentsSection[];
  isLoading: boolean;
  revalidate: () => void;
};

type BuildAttachmentSectionsInput = {
  selectedExtension: string;
  searchText: string;
};

function extensionNames(attachments: IndexedAttachment[]): string[] {
  const extensions = new Set<string>();

  for (const attachment of attachments) {
    if (attachment.extension) {
      extensions.add(attachment.extension);
    }
  }

  return Array.from(extensions).sort((a, b) => a.localeCompare(b));
}

function buildSections(
  attachments: IndexedAttachment[],
  input: BuildAttachmentSectionsInput,
): WorkspaceAttachmentsSection[] {
  const { selectedExtension, searchText } = input;
  const grouped = new Map<string, WorkspaceAttachmentsSection>();

  for (const attachment of attachments) {
    if (selectedExtension !== ALL_EXTENSIONS && attachment.extension !== selectedExtension) {
      continue;
    }

    if (searchText && !querySearchText(attachment, searchText)) {
      continue;
    }

    let section = grouped.get(attachment.workspace.path);
    if (!section) {
      section = {
        workspace: attachment.workspace,
        attachments: [],
      };
      grouped.set(attachment.workspace.path, section);
    }

    section.attachments.push(attachment);
  }

  return Array.from(grouped.values()).sort((a, b) => a.workspace.name.localeCompare(b.workspace.name));
}

export function useAttachments({
  workspaces,
  enabled = true,
  excludedExtensions,
  searchText,
  selectedExtension,
  refresh = false,
}: Options): Result {
  const preferences = extensionPreferences();
  const excludedDirectoryNames = preferences.excludedFoldersInWorkspaces;

  const {
    data: attachments,
    isLoading,
    revalidate,
  } = useCachedPromise(
    (refresh: boolean, workspaces: Workspace[], excludedExtensions: Set<string>, excludedDirectoryNames: Set<string>) =>
      getAttachments(workspaces, excludedExtensions, excludedDirectoryNames, { refresh }),
    [refresh, workspaces, excludedExtensions, excludedDirectoryNames],
    {
      execute: enabled,
      initialData: [] satisfies IndexedAttachment[],
      keepPreviousData: true,
      onError: async (error) => {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to scan attachments",
          message: error instanceof Error ? error.message : String(error),
        });
      },
      onData: () => {
        if (refresh) {
          void showToast({
            style: Toast.Style.Success,
            title: "Attachments refreshed",
          });
        }
      },
    },
  );

  useLoadingToast({
    isLoading: enabled && isLoading && !refresh,
    title: "Scanning attachments…",
  });

  const { dropdown, sections } = useMemo(() => {
    return {
      dropdown: extensionNames(attachments),
      sections: buildSections(attachments, { selectedExtension, searchText }),
    };
  }, [attachments, searchText, selectedExtension]);

  return {
    dropdown,
    sections,
    isLoading: !enabled || isLoading,
    revalidate,
  };
}
