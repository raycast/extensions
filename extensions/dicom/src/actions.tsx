import { Action, ActionPanel } from "@raycast/api";

function Actions({ tag }: { tag: string }) {
  return (
    <ActionPanel title={tag}>
      {tag && (
        <>
          <Action.CopyToClipboard title="Copy DICOM Tag" content={tag} />
          <Action.OpenInBrowser url={`http://dicomlookup.com/lookup.asp?sw=Tnumber&q=${tag}`} title="Open in Browser" />
        </>
      )}
    </ActionPanel>
  );
}

export default Actions;
