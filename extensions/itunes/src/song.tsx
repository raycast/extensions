import {
  ActionPanel,
  closeMainWindow,
  Detail,
  getPreferenceValues,
  Icon,
  List,
  popToRoot,
  PushAction,
  randomId,
  showToast,
  ToastStyle
} from "@raycast/api";
import { FC, useEffect, useRef, useState } from "react";
import { AbortError } from "node-fetch";
import fs from "fs";
import readline from "readline";
import { execSync } from "child_process";
import os from "os";

interface Preferences {
  using: 'iTunes' | 'Music',
  path: string
}
interface SearchState {
  results: SearchResult[];
  isLoading: boolean;
}

interface SearchResult {
  id: string;
  name: string;
  artist: string,
  album: string
}
interface runScriptProps {
  name?: string,
  album: string,
  artist: string
}
interface searchEntry {
  name: string,
  artist: string,
  album: string
}

let match: searchEntry[] = []
const preferences: Preferences = getPreferenceValues()
const XMLPath = preferences.path.replace(/^\s/, "").replace(/^~/, os.homedir())
if (!fs.existsSync(XMLPath)) {
  showToast(ToastStyle.Failure, 'Library XML File Not Found', 'Please correct the XML file path in extension preferences.').then();
  throw "Invalid XML file path"
}

const RunScript: FC<runScriptProps> = (props) => {
  useEffect(() => {
    if (props.name) {
      execSync(`osascript -e "tell application \\"${preferences.using}\\" to play (the first track of library playlist 1 whose album is \\"${props.album}\\" and name is \\"${props.name}\\")"`)
    } else {
      execSync(`osascript \
       -e "tell application \\"${preferences.using}\\"" \
       -e "if (exists playlist \\"ExtensionAlbumPlaying\\") then" -e \
       "delete playlist \\"ExtensionAlbumPlaying\\"" \
       -e "end if" \
       -e "set name of (make new playlist) to \\"ExtensionAlbumPlaying\\"" \
       -e "set theseTracks to every track of library playlist 1 whose album is \\"${props.album}\\" and artist is \\"${props.artist}\\"" \
       -e "repeat with thisTrack in theseTracks" \
       -e "duplicate thisTrack to playlist \\"ExtensionAlbumPlaying\\"" \
       -e "end repeat" \
       -e "play playlist \\"ExtensionAlbumPlaying\\"" \
       -e "end tell"`)
    }
    popToRoot().then()
    closeMainWindow({ clearRootSearch: true }).then()
  })
  return <Detail markdown={`#Calling ${preferences.using}...`} />
}

export default function Command() {
  const { state, search } = useSearch();

  return (
    <List isLoading={state.isLoading} onSearchTextChange={search} searchBarPlaceholder="Search by name..." throttle>
      <List.Section title="Results" subtitle={state.results.length + ""}>
        {state.results.map((searchResult) => (
          <SearchListItem key={searchResult.id} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  return (
    <List.Item
      title={searchResult.name}
      accessoryTitle={searchResult.album}
      subtitle={searchResult.artist}
      actions={
        <ActionPanel>
          <PushAction
            title={`Cue the Track`}
            target={<RunScript name={searchResult.name} album={searchResult.album} artist={searchResult.artist} />}
            icon={Icon.ArrowRight}
          />
          <PushAction
            title={`Play the Album`}
            target={<RunScript album={searchResult.album} artist={searchResult.artist} />}
            icon={Icon.ArrowRight}
          />
        </ActionPanel>
      }
    />
  );
}

function useSearch() {
  const [state, setState] = useState<SearchState>({ results: [], isLoading: true });
  const cancelRef = useRef<AbortController | null>(null);

  useEffect(() => {
    search("");
    return () => {
      cancelRef.current?.abort();
    };
  }, []);

  async function search(searchText: string) {
    cancelRef.current?.abort();
    cancelRef.current = new AbortController();
    try {
      setState((oldState) => ({
        ...oldState,
        isLoading: true,
      }));
      await performSearch(searchText, cancelRef.current.signal);
      setState((oldState) => ({
        ...oldState,
        results: match.map(entry => {
          return {
            id: randomId(),
            ...entry
          }
        }),
        isLoading: false,
      }));
    } catch (error) {
      if (error instanceof AbortError) {
        return;
      }
      console.error("search error", error);
      showToast(ToastStyle.Failure, "Could not perform search", String(error)).then();
    }
  }

  return {
    state: state,
    search: search,
  };
}

async function performSearch(searchText: string, signal: AbortSignal) {
  if (searchText.length <= 3) return []

  let sherlock = false
  let dictBlock = false
  let buffer = {
    album: '',
    artist: '',
    name: ''
  }
  match = []

  const read = readline.createInterface({
    input: fs.createReadStream(XMLPath),
    output: process.stdout,
    terminal: false
  })
  read.on('line', line => {

    if (line.indexOf('</dict>') >= 0) {
      dictBlock = false
      if (buffer.name.length > 0 && buffer.name.toLowerCase().indexOf(searchText.toLowerCase()) >= 0) {
        match = [...match, buffer]
      }
      buffer = {
        album: '',
        artist: '',
        name: ''
      }
    }

    if (line.indexOf('<dict>') >= 0) {
      dictBlock = true
      return
    }

    if (dictBlock) {
      const [key, value] = [line.match(/(?<=<key>).*?(?=<\/key>)/)||[], line.match(/(?<=<string>).*?(?=<\/string>)/)||'']
      if (key[0] === 'Name') {buffer.name = value[0]}
      if (key[0] === 'Artist') {buffer.artist = value[0]}
      if (key[0] === 'Album') {buffer.album = value[0]}
    }

    const [key, value] = [line.match(/(?<=<key>).*?(?=<\/key>)/)||[], line.match(/(?<=<string>).*?(?=<\/string>)/)||'']
  })
  read.on('close', () => {
    match = Array.from(new Set(match))
    sherlock = true
  })
  await waitUntil(() => sherlock)
}

const waitUntil = (condition: () => boolean) => {
  return new Promise<void>((resolve) => {
    const interval = setInterval(() => {
      if (!condition()) {
        return
      }
      clearInterval(interval)
      resolve()
    }, 100)
  })
}
