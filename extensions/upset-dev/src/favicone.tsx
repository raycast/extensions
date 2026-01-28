import { Action, ActionPanel, Form, Icon, List, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { FormEntry, EntryProps } from "./types/types";
import { addFaviconeToSupportDir, initializeSupportDir, validateSize, validateDomainName } from "./helpers/helpers";
import { SUPPORT_DIR, CTRL_X, CMD_SPACE } from "./helpers/consts";
import { useFaviconeHistory } from "./hooks/hooks";
import { useState } from "react";
import path from "node:path";
import fs from "node:fs";
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
      addFaviconeToSupportDir(formValue);
      // 'pop-back' to the base component
      pop();
    },
    initialValues: {
      domain: "upset.dev",
      size: "64",
    },
    validation: {
      domain: validateDomainName,
      size: validateSize,
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
      <Form.TextField title="Icon Size (px)" {...itemProps.size} />
    </Form>
  );
}

/** A component that shows all of the searched favicons. If the user hasn't searched anything yet,
 * by default there is a `List.Item.Detail` that the user can interact to create an entry.
 */
export default function ShowSearchedFavicons() {
  // primary `LocalStorage`, in order for other component to interact with this primary `LocalStorage`,
  // it has to pass the function of this `LocalStorage` as a callback.
  const { entries, addHistoryEntry, removeHistoryEntry, isLoading } = useFaviconeHistory();
  // used to toggle the state for each history entry
  const [showDetail, setShowDetail] = useState(false);
  // create the support directory (if not exists) to store all searched favicones.
  initializeSupportDir();
  return (
    <List isLoading={isLoading} isShowingDetail={showDetail}>
      {entries.map((entry, idx) => {
        // this is used to get the icon immediately (upon submission) and pass it into `icon` property in `List.Item`
        const url = `https://favicone.com/${entry.domain}?s=64`;
        // this is used to get the preview of that icon when the user clicks 'Show Details'
        const faviconPath = path.join(SUPPORT_DIR, `${entry.domain}-${entry.size}.png`);
        // just being careful if `faviconPath` has spaces
        const encoded = encodeURI(faviconPath);

        return (
          <List.Item
            key={idx}
            title={entry.domain}
            subtitle={`size: ${entry.size}px`}
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
                  onAction={() => {
                    removeHistoryEntry(entry);
                    fs.rmSync(faviconPath);
                  }}
                  shortcut={CTRL_X}
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
                    <List.Item.Detail.Metadata.Label title="Dimension" text={`${entry.size}px`} />
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
