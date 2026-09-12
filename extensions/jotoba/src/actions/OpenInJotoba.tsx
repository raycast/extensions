import { Action } from "@raycast/api";

/**
 * The action that allows users to access the viewed/selected
 * entry directly on Jotoba.de
 */
const OpenInJotoba = ({ searchTerm }: { searchTerm: string }) => {
  return (
    <Action.OpenInBrowser
      title="Open Search Results on Jotoba.de"
      url={encodeURI(`https://jotoba.de/search/${searchTerm}`)}
      icon={{ source: "JotoHead.svg" }}
    />
  );
};

export default OpenInJotoba;
