# Developing Bricks Builder for Raycast

## Helper plugin endpoints

All under `/wp-json/bricks-raycast/v1`, for users who can `edit_posts`, authenticated with an application password. `/design`, `/audit` and `/audit/images` scan the whole site, so their results are cached for 10 minutes and cleared whenever content, Bricks settings or images change; add `fresh=1` to skip the cache.

- `GET /status` – plugin and Bricks versions, builder-enabled post types
- `GET /content?scope=bricks|all` – everything you can open in Bricks, templates included, in one request
- `GET /post/{id}` – one post with its builder URL
- `GET /design` – global classes (with usage counts), color palettes, global variables, theme styles
- `GET /class/{id}` – one class's generated CSS, the elements it's on and the pages and components that use it
- `GET /site` – breakpoints, theme styles with conditions, states, CSS loading method
- `GET /search?q=&element=` – elements on all pages, templates and components matching text, a class, a CSS value or an element type
- `GET /audit` – unused classes, class trash, templates without conditions, Code elements, images without alt text, element counts
- `POST /audit/trash-classes`, `POST /audit/restore-classes` – move unused classes (`ids`) to Bricks' class trash and back; administrators only
- `GET /audit/images` – every image Bricks uses with its issues, dynamic images, and unused media library images without alt
- `POST /attachment/{id}/alt` – set an image's alt text (`alt`), or mark it decorative (`decorative: true`)
- `GET /library` – templates and global components with their element outline
- `GET /library/template/{id}`, `GET /library/component/{id}` – a template or component instance in Bricks' clipboard format, with its global classes and components
- `GET /forms`, `GET /forms/submissions?form_id=&after_id=&page=&per_page=`, `POST /forms/submissions/delete` – stored form submissions; administrators only
- `GET /health` – versions, settings and available updates
- `POST /tools/maintenance` (`mode`: `maintenance`, `comingSoon` or empty), `POST /tools/regenerate-css`, `POST /tools/regenerate-signatures`, `POST /tools/clear-cache` – administrators only
- `GET /dynamic-tags` – every dynamic data tag the builder offers, with its group and provider
- `POST /create` – create a draft (`type`, `title`, `template_type`)
- `GET /license?refresh=1`, `POST /license` (`key`), `DELETE /license` – the site's Bricks Raycast Pro license: status, activate a key, deactivate; administrators only

Without a Pro license, `/audit*`, `/attachment/*`, `/search`, `/dynamic-tags`, `/forms*`, `/tools/*` and `/library*` answer `402` with the code `bricks_raycast_pro_required`. `/status` and `/health` include the license status.

## License server

The license server runs at https://license.martej.com and lives in its own private repository, [matejmohar/martej-license-server](https://github.com/matejmohar/martej-license-server). It's a Cloudflare Worker between the helper plugin and Creem: it activates and checks license keys (Creem's API key stays on the server), gives licensed sites plugin updates, and takes Creem's webhooks, so refunds and disputes cut access right away.

## Releasing the helper plugin

Bump the plugin's version, run `npm run helper-zip`, commit, then push an annotated tag whose message is the changelog: `git tag -a helper-v1.6.0 -m "- What changed"` and `git push origin helper-v1.6.0`. The [release workflow](.github/workflows/release-helper.yml) checks the version and zip, publishes the update to licensed sites through the license server, and creates a GitHub release with the zip. The one-time setup is at the top of the workflow file. To release by hand: `node scripts/release-helper.mjs` (`--dry-run` to see what it uploads).

## Develop

```bash
npm install
npm run dev     # loads the extension into Raycast with hot reload
npm run lint
npm run build
npm run helper-zip   # after changing the helper plugin: rebuilds assets/bricks-raycast-helper.zip
```

## Store screenshots

The Store wants 3–6 PNGs of 2000×1250 in `metadata/`, on the same background. Run `npm run dev`, take window screenshots of the Raycast window (CleanShot window capture with shadow off, or ⌘⇧4, Space, ⌥-click), then:

```bash
python3 scripts/store-screenshots.py ~/Desktop/shots/1-open.png ~/Desktop/shots/2-classes.png …
```

It centers each window on the same yellow background and writes `metadata/bricks-builder-1.png` and on, in the order given. Use one Raycast theme for all of them, and no real client data.

