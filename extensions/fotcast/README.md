# Fotcast

Football fixtures and scores in Raycast, from FotMob.

- **Matches** shows every league's matches for one day, grouped by competition.
  Each row's title is followed by the kickoff time before the match starts,
  then the match clock (minute, HT, FT) once it starts. The right side shows
  Home crest, score badge, Away crest. When the match finishes the score badge turns green for a win, red for a loss and grey for a draw, judged from your favorite club's side when one is playing and from the home side otherwise.
- Favorite any number of teams and leagues. Matches involving a favorite team
  are pinned to a `★ Teams` section at the top, followed by one `★ <league>`
  section per favorite league, then the rest of the day in FotMob's own order.
  A favorite-team match keeps a star in its league section too.
- The `All Leagues` / `Favorites` dropdown switches between the whole day and
  the pinned sections only, and also lists each league playing that day so
  you can jump straight to one. The choice is remembered between launches.
- The footer shows the day. ⌘] is the next day, ⌘[ the previous day, ⌘T
  today, and Pick Date in the action panel opens a calendar.
- Enter on a match opens a full-screen view: a scoreboard with both crests,
  the score, minute, goals and red cards per side, a pitch chart of both
  starting elevens with formations, substitutions with minutes, player ratings
  in FotMob's colours (blue 9+, green 7 to 8.9, orange 6 to 6.9, red below), and a sidebar
  with kickoff, competition, stadium, referee, attendance and top match stats.
- While any match on screen is live, the list refreshes every 60 seconds.
- **Favorites** searches FotMob for teams and leagues and stars them. With an
  empty search box it lists what you have already favorited.

No setup, no sign-in, no preferences. Install and run.

Fotcast reads FotMob's public web endpoints, which are undocumented and not an
official API. They can change shape or disappear without notice, and when that
happens the extension shows an error toast until it is updated. No key or
account is involved, and nothing is sent anywhere except to FotMob.

## Development

```sh
npm install
npm run dev        # ray develop, registers both commands into Raycast
npm run lint       # ray lint (npm run fix-lint to autofix)
npm run typecheck  # tsc --noEmit
npm test           # node --test against test/fixtures
npm run build      # ray build
```

```
src/
├── matches.tsx     command: a day's matches, sections, day navigation, live refresh
├── favorites.tsx   command: favorite teams and leagues, FotMob search
├── detail.tsx      pushed match view: SVG scoreboard + metadata sidebar
├── schedule.ts     pure logic: date keys, day labels, match state, sections
├── store.ts        Favorites type + useFavorites() over LocalStorage
└── fotmob.ts       FotMob types, fetchers, image and page URL helpers
```

`icon-source.html` is the editable icon source (render with headless Chrome to
`assets/extension-icon.png`).
