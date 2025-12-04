# Contributing

If you're interested in contributing to this project, you're very welcome to do so! The project is hosted at https://github.com/rosvik/raycast-public-transport.

If you want to want to add a bigger feature or do a major change to the project, please open an issue first, so we can make sure we're on the same page.

## Installing

1. Clone the repo
2. Run `npm install`
3. Run `npm run dev`
4. Raycast will then open with a development version of the extension installed.

See https://developers.raycast.com/ for more information on how to develop Raycast extensions.

## Rate limit

There's no authentication needed for the Journey Planner API, but it has a [rate limit of 1000 requests per minute](https://enturas.atlassian.net/wiki/spaces/PUBLIC/pages/3736993955/Rate-limit+Policy+Journey-Planner-v3#Policy-levels) shared between all users of this extension. This should be plenty for normal use, but if you're making an unusual amount of requests, please consider changing `CLIENT_NAME` in `api.ts`, using [this format](https://developer.entur.org/pages-journeyplanner-journeyplanner#authentication).
