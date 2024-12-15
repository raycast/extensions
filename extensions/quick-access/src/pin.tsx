import {
  Action,
  ActionPanel,
  closeMainWindow,
  Form,
  Icon,
  LocalStorage,
  PopToRootType,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { checkDuplicatePath, fetchDirectoryPath, getLocalStorage, isDirectory, isEmpty } from "./utils/common-utils";
import { DirectoryInfo, DirectoryType } from "./types/types";
import { parse } from "path";
import { LocalStorageKey } from "./utils/constants";
import React, { useMemo } from "react";
import { FormValidation, useForm } from "@raycast/utils";
import { useCurFinderPath } from "./hooks/useCurFinderPath";
import { ActionConfigureCommand } from "./components/action-configure-command";

interface PinFormValues {
  paths: string[];
}

export default function Pin() {
  const { handleSubmit, itemProps, setValue } = useForm<PinFormValues>({
    async onSubmit(values) {
      await closeMainWindow({ popToRootType: PopToRootType.Immediate });
      await pinFiles(values.paths);
    },
    validation: {
      paths: FormValidation.Required,
    },
  });

  const { data: curFinderPathData, isLoading, mutate } = useCurFinderPath();

  useMemo(() => {
    if (curFinderPathData) {
      const paths: string[] = [];
      paths.push(curFinderPathData);
      setValue("paths", paths);
    }
  }, [curFinderPathData]);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Tack} title="Pin" onSubmit={handleSubmit} />
          <Action title={"Fetch Path"} icon={Icon.Repeat} onAction={mutate} />
          <ActionConfigureCommand />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        title={"Folder or File"}
        canChooseDirectories={true}
        showHiddenFiles={false}
        canChooseFiles={true}
        allowMultipleSelection={true}
        {...itemProps.paths}
      />
    </Form>
  );
}

export const pinFiles = async (folderPaths: string[] = [], closeMainWindow = true) => {
  try {
    const _localstorage = await getLocalStorage(LocalStorageKey.LOCAL_PIN_DIRECTORY);
    const localDirectory = isEmpty(_localstorage) ? [] : JSON.parse(_localstorage);

    const directorPath = folderPaths.length === 0 ? await fetchDirectoryPath() : folderPaths;
    const timeStamp = new Date().getTime();
    const newDirectory: DirectoryInfo[] = [];
    directorPath.forEach((value, index) => {
      const parsedPath = parse(value);
      if (!checkDuplicatePath(value, localDirectory)) {
        newDirectory.push({
          id: isDirectory(value) ? DirectoryType.FOLDER : DirectoryType.FILE + (timeStamp + index),
          name: parsedPath.base,
          path: value,
          type: isDirectory(value) ? DirectoryType.FOLDER : DirectoryType.FILE,
          valid: true,
          rank: 1,
          date: timeStamp + index,
        });
      }
    });

    await LocalStorage.setItem(
      LocalStorageKey.LOCAL_PIN_DIRECTORY,
      JSON.stringify(newDirectory.concat(localDirectory)),
    );
    if (newDirectory.length === 0) {
      closeMainWindow
        ? await showHUD(`Nothing is pinned`)
        : await showToast(Toast.Style.Success, `Nothing are pinned.`);
      return;
    }
    const hudName = newDirectory[0].name + (newDirectory.length > 1 ? `, etc. are` : " is");
    closeMainWindow ? await showHUD(`${hudName} pinned`) : await showToast(Toast.Style.Success, `${hudName} pinned.`);
  } catch (e) {
    console.error(String(e));
    closeMainWindow ? await showHUD(String(e)) : await showToast(Toast.Style.Failure, String(e));
  }
};
