import { Action, ActionPanel, Form, Icon, useNavigation, showToast, Toast } from "@raycast/api";
import { AuthorMap } from "./types";
import { findGitReposInDir, getCoAuthorsForDir } from "./utils";
import AuthorsSelector from "./authors-selector";
import { useState, useRef } from "react";

export default function LoadCoAuthorsFromFolder() {
  const nav = useNavigation();
  const [authors, setAuthors] = useState<AuthorMap>(new Map());
  const scanIdRef = useRef(0);
  const isScanningRef = useRef(false);

  return (
    <Form
      navigationTitle={`Load Authors`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={"Load Authors"}
            icon={Icon.AddPerson}
            onSubmit={async () => {
              if (authors.size === 0) {
                await showToast(Toast.Style.Failure, "No authors loaded yet");
                return;
              }

              const _authors = [...authors.values()];
              _authors.sort((a1, a2) => (a1.name < a2.name ? -1 : 1));
              nav.push(<AuthorsSelector authors={_authors} allSelected />);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="source-folder"
        title="Source Folder"
        canChooseDirectories
        canChooseFiles={false}
        onChange={async (selection) => {
          if (selection.length === 0) {
            const wasScanning = isScanningRef.current;
            isScanningRef.current = false;
            ++scanIdRef.current; // invalidate any in-flight scan
            setAuthors(new Map());
            if (wasScanning) await showToast({ style: Toast.Style.Failure, title: "Scan cancelled" });
            return;
          }

          isScanningRef.current = true;
          const currentScanId = ++scanIdRef.current;

          try {
            await showToast(Toast.Style.Animated, "Scanning for repositories...");

            const repos = (await Promise.all(selection.map(findGitReposInDir))).flat();

            if (currentScanId !== scanIdRef.current) return;

            if (repos.length === 0) {
              isScanningRef.current = false;
              await showToast(Toast.Style.Failure, "No git repositories found in folder");
              return;
            }

            await showToast(Toast.Style.Animated, `Loading authors from ${repos.length} repos...`);

            const authors = await Promise.all(repos.map(getCoAuthorsForDir));

            if (currentScanId !== scanIdRef.current) return;

            const newAuthors: AuthorMap = new Map();
            for (const author of authors.flat()) {
              newAuthors.set(author.email, author);
            }
            setAuthors(newAuthors);

            isScanningRef.current = false;
            await showToast(Toast.Style.Success, `Found authors in ${repos.length} repos`);
          } catch (e) {
            if (currentScanId !== scanIdRef.current) return;
            isScanningRef.current = false;
            await showToast(Toast.Style.Failure, "Failed to scan folder");
            console.error(e);
          }
        }}
      />
    </Form>
  );
}
