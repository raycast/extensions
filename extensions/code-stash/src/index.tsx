import { useCallback, useEffect, useState } from "react";
import { ActionPanel, Icon, List, LocalStorage, confirmAlert, Alert } from "@raycast/api";
import { Language, CodeStash } from "./types";
import {
  Preview,
  ViewAction,
  CreateAction,
  DeleteAction,
  EmptyView,
  CopyAction,
  ExportAction,
  EditAction,
  ImportAction,
} from "./components";
import { useCopy, useExport, useImport } from "./actions";
import { nanoid } from "nanoid";
import detectLang from "lang-detector";

type State = {
  filter: Language;
  isLoading: boolean;
  searchText: string;
  codeStashes: CodeStash[];
  visibleCodeStashes: CodeStash[];
};

export default function Command() {
  const [state, setState] = useState<State>({
    filter: Language.All,
    isLoading: true,
    searchText: "",
    codeStashes: [],
    visibleCodeStashes: [],
  });

  const { handleCopy } = useCopy();
  const { handleExport } = useExport();
  const { readFile, readFolder, isValidFile, isFolder } = useImport();

  useEffect(() => {
    (async () => {
      const storedCodeStashes = await LocalStorage.getItem<string>("codeStashes");

      if (!storedCodeStashes) {
        setState((previous) => ({ ...previous, isLoading: false }));
        return;
      }

      try {
        const codeStashes: CodeStash[] = JSON.parse(storedCodeStashes);
        setState((previous) => ({ ...previous, codeStashes, isLoading: false }));
      } catch (e) {
        // can't decode codeStashes
        setState((previous) => ({
          ...previous,
          codeStashes: [],
          isLoading: false,
        }));
      }
    })();
  }, []);

  useEffect(() => {
    LocalStorage.setItem("codeStashes", JSON.stringify(state.codeStashes));
  }, [state.codeStashes]);

  const handleCreate = useCallback(
    (title: string, code: string, language: string, id: string) => {
      const newCodeStashes = [...state.codeStashes, { id, title, code, language }];
      setState((previous) => ({
        ...previous,
        codeStashes: newCodeStashes,
        filter: Language.All,
        searchText: "",
      }));
    },
    [state.codeStashes, setState]
  );

  const handleEdit = useCallback(
    (title: string, code: string, language: string, id: string) => {
      setState((prevState) => {
        const newCodeStashes = [...prevState.codeStashes];
        const index = newCodeStashes.findIndex((codeStash) => codeStash.id === id);
        newCodeStashes[index] = { id, title, code, language };
        return {
          ...prevState,
          codeStashes: newCodeStashes,
          filter: Language.All,
          searchText: "",
        };
      });
    },
    [setState]
  );

  const deleteAlertOptions: Alert.Options = {
    title: "Are you sure?",
    message: "This action cannot be undone",
    icon: Icon.Trash,
  };

  async function handleDelete(index: number) {
    if (await confirmAlert(deleteAlertOptions)) {
      const newCodeStashes = [...state.codeStashes];
      newCodeStashes.splice(index, 1);
      setState((previous: any) => ({ ...previous, codeStashes: newCodeStashes }));
    }
  }

  async function buildImportedCodeStash(file: string) {
    const data = await readFile(file);
    const filename = file.replace(/^.*[\\/]/, "").replace(/.txt$/, "");

    const lang = detectLang(data) ?? "Unknown";

    if (data) {
      return { id: nanoid(), title: filename, code: data, language: lang };
    }
  }

  async function handleImport(files: string[]) {
    const importedStashes = [] as CodeStash[];

    for (const file of files) {
      if (isValidFile(file) || isFolder(file)) {
        const fileList = isValidFile(file) ? [file] : await readFolder(file);

        if (!fileList) continue;

        for (const file of fileList) {
          const codeStash = await buildImportedCodeStash(file);
          if (codeStash) importedStashes.push(codeStash);
        }
      }
    }

    setState((previous) => ({
      ...previous,
      codeStashes: [...previous.codeStashes, ...importedStashes],
      filter: Language.All,
      searchText: "",
    }));
  }

  const filterCodeStashes = useCallback(() => {
    const { filter, codeStashes } = state;

    if (filter !== Language.All) {
      return codeStashes.filter((codeStash) => codeStash.language === filter);
    }

    return codeStashes;
  }, [state.codeStashes, state.filter]);

  return (
    <List
      isShowingDetail
      isLoading={state.isLoading}
      searchText={state.searchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Language"
          value={state.filter}
          onChange={(newValue) =>
            setState((previous) => ({
              ...previous,
              filter: newValue as Language,
            }))
          }
        >
          {Object.values(Language).map((language, index) => (
            <List.Dropdown.Item key={index} title={language} value={language} />
          ))}
        </List.Dropdown>
      }
      enableFiltering
      onSearchTextChange={(newValue) => {
        setState((previous) => ({ ...previous, searchText: newValue }));
      }}
    >
      <EmptyView
        codeStashes={filterCodeStashes()}
        searchText={state.searchText}
        onCreate={handleCreate}
        onImport={(files) => handleImport(files)}
      />
      {filterCodeStashes().map((codeStash, index) => (
        <List.Item
          key={codeStash.id}
          icon={Icon.Terminal}
          title={codeStash.title}
          subtitle={codeStash.language}
          detail={<Preview codeStash={codeStash} />}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <ViewAction codeStash={codeStash} />
                <CopyAction onCopy={() => handleCopy(index, state.codeStashes)} />
                <CreateAction onCreate={handleCreate} />
                <EditAction codeStash={codeStash} onEdit={handleEdit} />
                <DeleteAction onDelete={() => handleDelete(index)} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <ExportAction onExport={() => handleExport(state.codeStashes)} />
                <ImportAction onImport={(files) => handleImport(files)} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
