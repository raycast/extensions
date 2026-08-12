import { Action, ActionPanel, Form, Icon, List, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { FormEntry, EntryProps, ResizeIconProps } from "./types/types";
import {
  addFaviconeToSupportDir,
  initializeSupportDir,
  validateSize,
  validateDomainName,
  validateSizeLoose,
} from "./helpers/helpers";
import { SUPPORT_DIR, CTRL_X, CMD_SPACE } from "./helpers/consts";
import { useFaviconeHistory } from "./hooks/hooks";
import { useState } from "react";
import path from "node:path";
import fsp from "node:fs/promises";
import { Jimp } from "jimp";

function ResizeIconPrompt({ oldEntry, faviconDir, faviconFileName, replaceToHistory }: ResizeIconProps) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ width: string; height: string }>({
    onSubmit: async function ({ width, height }) {
      // read old file
      const oldFullPath = path.join(faviconDir, faviconFileName);
      const oldFileContent = await Jimp.read(oldFullPath);
      // resize old file
      oldFileContent.resize({
        w: Number(width),
        h: Number(height),
      });
      // and write it to a new file
      const newFilePath = path.join(faviconDir, `${oldEntry.domain}-${width}w-${height}h.png`);
      await oldFileContent.write(newFilePath as `${string}.${string}`);
      // remove old file
      await fsp.rm(oldFullPath);
      // add new entry in history
      const newEntry: FormEntry = {
        domain: oldEntry.domain,
        width: width,
        height: height,
      };

      replaceToHistory(oldEntry, newEntry);
      // pop back to `ShowSearchedFavicons`
      pop();
    },
    initialValues: {
      width: "128",
      height: "128",
    },
    validation: {
      width: validateSizeLoose,
      height: validateSizeLoose,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Resize Icon" icon={Icon.ArrowsExpand} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="width (px)" {...itemProps.width} />
      <Form.TextField title="height (px)" {...itemProps.height} />
    </Form>
  );
}
/** A component that prompts the user to enter detail to search for a favicon such as `domain` and `size` of an icon in pixels.
 *  This is the component that is navigated after the user clicked 'Search more Icons' in the `ShowSearchedFavicons` component.
    After the user submitted the form, the user will be redirected into `ShowSearchedFavicons` component.
  */
function AddSearchedEntry({ addToHistory }: EntryProps) {
  // `pop` function from `useNavigation` is used to 'pop-back' to the base component which is `ShowSearchedFavicons`
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<FormEntry>({
    onSubmit: async function (formValue) {
      // add `formValue` to `LocalStorage`
      addToHistory(formValue);
      // save image to `SUPPORT_DIR`
      await addFaviconeToSupportDir(formValue);
      // 'pop-back' to the base component
      pop();
    },
    initialValues: {
      domain: "upset.dev",
      width: "64",
      height: "64",
    },
    validation: {
      domain: validateDomainName,
      width: validateSize,
      height: validateSize,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Icon" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Website" {...itemProps.domain} />
      <Form.TextField title="Width (px)" {...itemProps.width} />
      <Form.TextField title="Height (px)" {...itemProps.height} />
    </Form>
  );
}

/** A component that shows all of the searched favicons. If the user hasn't searched anything yet,
 * by default there is a `List.Item.Detail` that the user can interact to create an entry.
 */
export default function ShowSearchedFavicons() {
  // primary `LocalStorage`, in order for other component to interact with this primary `LocalStorage`,
  // it has to pass the function of this `LocalStorage` as a callback.
  const { entries, addHistoryEntry, removeHistoryEntry, replaceHistoryEntry, isLoading } = useFaviconeHistory();
  // used to toggle the state for each history entry
  const [showDetail, setShowDetail] = useState(false);
  // create the support directory (if not exists) to store all searched favicones.
  initializeSupportDir();

  return (
    <List isLoading={isLoading} isShowingDetail={showDetail}>
      {entries.map((entry, idx) => {
        // this is used to get the icon immediately (upon submission) and pass it into `icon` property in `List.Item`
        const url = `https://favicone.com/${entry.domain}?s=64`;
        // favicon will be saved based on this format `<domain>-<width>w-<height>h.png`
        const faviconFileNameFormat = `${entry.domain}-${entry.width}w-${entry.height}h.png`;
        // this is used to get the preview of that icon when the user clicks 'Show Details'
        const faviconPath = path.join(SUPPORT_DIR, faviconFileNameFormat);
        // just being careful if `faviconPath` has spaces
        const encoded = encodeURI(faviconPath);

        return (
          <List.Item
            key={idx}
            title={entry.domain}
            subtitle={`${entry.width} width (px) x ${entry.height} height (px)`}
            icon={url}
            actions={
              <ActionPanel>
                <Action
                  title="Show Details"
                  icon={Icon.Info}
                  onAction={() => setShowDetail((detail) => (detail = !detail))}
                />
                <Action
                  title="Delete Entry"
                  icon={Icon.DeleteDocument}
                  onAction={async () => {
                    removeHistoryEntry(entry);
                    await fsp.rm(faviconPath);
                  }}
                  shortcut={CTRL_X}
                />
                <Action.Push
                  title="Resize Icon"
                  icon={Icon.ArrowsExpand}
                  target={
                    <ResizeIconPrompt
                      replaceToHistory={replaceHistoryEntry}
                      oldEntry={entry}
                      faviconDir={SUPPORT_DIR}
                      faviconFileName={faviconFileNameFormat}
                    />
                  }
                />
                <Action.CopyToClipboard
                  title="Copy Favicon"
                  icon={Icon.CopyClipboard}
                  content={{ file: faviconPath }}
                  shortcut={CMD_SPACE}
                />
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                markdown={`![preview](${encoded})`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Fullpath" text={faviconPath} />
                    <List.Item.Detail.Metadata.Label title="Filename" text={path.basename(faviconPath)} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Width" text={`${entry.width}px`} />
                    <List.Item.Detail.Metadata.Label title="Height" text={`${entry.height}px`} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        );
      })}
      <List.Item
        key="search-more-icons"
        title="Search more Icons"
        icon={Icon.Plus}
        actions={
          <ActionPanel>
            <Action.Push
              title="Search More Icons"
              icon={Icon.MagnifyingGlass}
              target={<AddSearchedEntry addToHistory={addHistoryEntry} />}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
