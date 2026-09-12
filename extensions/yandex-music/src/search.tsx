import { useEffect, useState } from "react";
import { Action, ActionPanel, closeMainWindow, Icon, List } from "@raycast/api";
import { runJSInYandexMusicTab } from "./utils";

type IPlaybale = {
  link: string;
  title: string;
  icon: string;
  idx: string;
};

type Artist = IPlaybale;

type Album = {
  artists: string;
} & IPlaybale;

type Track = {
  album: string;
} & IPlaybale;

type PodcastEpisode = IPlaybale;

type Playlist = {
  likes: string;
} & IPlaybale;

type SearchResult = {
  artists: Artist[];
  albums: Album[];
  tracks: Track[];
  podcasts: Track[];
  podcastEpisodes: PodcastEpisode[];
  playlists: Playlist[];
};

const searchTracks = async (searchText: string): Promise<SearchResult | undefined> => {
  await runJSInYandexMusicTab(`window.YME_SEARCH('${searchText.replaceAll("'", "\\\\'")}')`);
  await new Promise((resolve) => setTimeout(resolve, 500)); // wait for a while to be sure that suggest updated
  const getSearchRes = await runJSInYandexMusicTab(`window.YME_GET_SEARCH_RESULT()`);

  if (!getSearchRes) {
    return undefined;
  }

  return JSON.parse(getSearchRes) as SearchResult;
};

function Actions(props: { item: IPlaybale }) {
  return (
    <ActionPanel title={props.item.title}>
      <Action
        title="Play"
        onAction={() => {
          runJSInYandexMusicTab(
            `document.querySelector('.button-play[data-idx=\\\\'${props.item.idx}\\\\']:not(.button-play_playing)').click();`
          ).then(() => closeMainWindow());
        }}
      />
    </ActionPanel>
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [result, setResult] = useState<SearchResult | undefined>(undefined);

  useEffect(() => {
    // for better performance
    runJSInYandexMusicTab(`
        window.YME_SEARCH_BAR = document.querySelector('.d-suggest input');
        window.YME_CLICK_EVENT = new Event('click');
        window.YME_GET_ICON = function (src) {
          return src.replace('40x40', '80x80')
        }
        window.YME_MAP_TRACK = function (el) {
            return { 
                link: el.querySelector('a').href,
                title: el.querySelector('.d-suggest-item__title-main').innerText,
                album: el.querySelector('.d-suggest-item__title-secondary').innerText,
                icon: window.YME_GET_ICON(el.querySelector('img').src),
                idx: el.querySelector('.button-play').dataset.idx
            }
        };
        window.YME_MAP_PLAYLIST = function (el) {
          return { 
              link: el.querySelector('a').href,
              title: el.querySelector('.d-suggest-item__title-main').innerText,
              likes: el.querySelector('.d-suggest-item__likes-number').innerText,
              icon: window.YME_GET_ICON(el.querySelector('img').src),
              idx: el.querySelector('.button-play').dataset.idx
          }
        };
        window.YME_MAP_EPISODE = function (el) {
          return { 
              link: el.querySelector('a').href,
              title: el.querySelector('.d-suggest-item__title-main').innerText,
              icon: window.YME_GET_ICON(el.querySelector('img').src),
              idx: el.querySelector('.button-play').dataset.idx
          }
        };
        window.YME_MAP_ARTIST = function (el) {
          return { 
              link: el.querySelector('a').href,
              title: el.querySelector('.d-suggest-item__title-main').innerText,
              icon: window.YME_GET_ICON(el.querySelector('img').src),
              idx: el.querySelector('.button-play').dataset.idx
          }
        };
        window.YME_MAP_ALBUM = function (el) {
          return { 
              link: el.querySelector('a').href,
              title: el.querySelector('.d-suggest-item__title-main').innerText,
              artists: el.querySelector('.d-suggest-item__title-secondary').innerText,
              icon: window.YME_GET_ICON(el.querySelector('img').src),
              idx: el.querySelector('.button-play').dataset.idx
          }
        };
        window.YME_GET_SEARCH_RESULT = function () {
          return JSON.stringify({
            artists: [].map.call(document.querySelectorAll('.d-suggest__item-artist'), window.YME_MAP_ARTIST),
            albums: [].map.call(document.querySelectorAll('.d-suggest__item-album'), window.YME_MAP_ALBUM),
            tracks: [].map.call(document.querySelectorAll('.d-suggest__item-track'), window.YME_MAP_TRACK),
            podcasts: [].map.call(document.querySelectorAll('.d-suggest__item_podcast'), window.YME_MAP_TRACK),
            podcastEpisodes: [].map.call(document.querySelectorAll('.d-suggest__item-podcast-track'), window.YME_MAP_EPISODE),
            playlists: [].map.call(document.querySelectorAll('.d-suggest__item-playlist'), window.YME_MAP_PLAYLIST),
          });
        };
        window.YME_SEARCH = function (text) {
            window.YME_SEARCH_BAR.value = text;
            window.YME_SEARCH_BAR.dispatchEvent(window.YME_CLICK_EVENT);
        };
    `);
  });

  useEffect(() => {
    searchTracks(searchText).then((result) => setResult(result));
  }, [searchText]);

  return (
    <List
      enableFiltering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search your favorite track, podcast and more..."
    >
      {result && (
        <>
          <List.Section title="Artists">
            {result.artists.map((artist) => (
              <List.Item
                key={artist.link}
                title={artist.title.trim()}
                icon={{ source: artist.icon }}
                actions={<Actions item={artist} />}
              />
            ))}
          </List.Section>
          <List.Section title="Albums">
            {result.albums.map((album) => (
              <List.Item
                key={album.link}
                title={album.title.trim()}
                subtitle={album.artists.trim()}
                icon={{ source: album.icon }}
                actions={<Actions item={album} />}
              />
            ))}
          </List.Section>
          <List.Section title="Tracks">
            {result.tracks.map((track) => (
              <List.Item
                key={track.link}
                title={track.title.trim()}
                subtitle={track.album.trim()}
                icon={{ source: track.icon }}
                actions={<Actions item={track} />}
              />
            ))}
          </List.Section>
          <List.Section title="Podcasts and Books">
            {result.podcasts.map((podcast) => (
              <List.Item
                key={podcast.link}
                title={podcast.title.trim()}
                subtitle={podcast.album.trim()}
                icon={{ source: podcast.icon }}
                actions={<Actions item={podcast} />}
              />
            ))}
          </List.Section>
          <List.Section title="Podcast episodes">
            {result.podcastEpisodes.map((episode) => (
              <List.Item
                key={episode.link}
                title={episode.title.trim()}
                icon={{ source: episode.icon }}
                actions={<Actions item={episode} />}
              />
            ))}
          </List.Section>
          <List.Section title="Playlists">
            {result.playlists.map((playlist) => (
              <List.Item
                key={playlist.link}
                title={playlist.title.trim()}
                icon={{ source: playlist.icon }}
                accessories={[{ text: playlist.likes, icon: Icon.Star }]}
                actions={<Actions item={playlist} />}
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
