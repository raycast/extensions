# Internal URL census

Every URL below was read from the browser's own `chrome://chrome-urls` page, with
_Internal debugging pages_ enabled, over the DevTools Protocol on **2026-09-09**.
This file is generated from that census — it is the source of `supportedBrowsers`
in `src/data/paths.ts`, not a hand-maintained list.

| Browser          | Scheme       | Version                | URLs listed |
| ---------------- | ------------ | ---------------------- | ----------- |
| Google Chrome    | `chrome://`  | 152.0.7977.83          | 198         |
| Brave            | `brave://`   | 152.1.94.121           | 219         |
| Microsoft Edge   | `edge://`    | 152.0.4191.66          | 124         |
| Vivaldi          | `vivaldi://` | 8.2.4133.47            | 193         |
| Opera            | `opera://`   | 135.0 (Chromium 151)   | 127         |
| Perplexity Comet | `comet://`   | 145.2.7632.5934        | 174         |
| Arc              | `arc://`     | 1.161.1 (Chromium 152) | 193         |
| Dia              | `dia://`     | 1.48.0 (Chromium 152)  | 193         |

ChatGPT Atlas is not listed: the app bundle at `/Applications/ChatGPT Atlas.app` is an
empty stub with no binary, so it could not be censused. It was dropped from the extension in 1.2.0.

## Compatibility matrix

`•` = advertised by that browser's own URL list.

| URL                                                      | Kind                | Chrome | Brave | Edge | Vivaldi | Opera | Comet | Arc | Dia |
| -------------------------------------------------------- | ------------------- | ------ | ----- | ---- | ------- | ----- | ----- | --- | --- |
| `1js-internals`                                          | Standard            |        |       | •    |         |       |       |     |     |
| `about`                                                  | Standard            |        |       | •    |         | •     |       |     |     |
| `access-code-cast`                                       | Standard            | •      | •     |      | •       |       | •     | •   | •   |
| `accessibility`                                          | Standard            | •      | •     | •    | •       | •     | •     | •   | •   |
| `activity`                                               | Standard            |        |       |      |         | •     |       |     |     |
| `actor-internals`                                        | Internal debugging  | •      | •     | •    | •       |       | •     | •   | •   |
| `actor-overlay`                                          | Standard            | •      | •     |      | •       |       | •     | •   | •   |
| `adblock`                                                | Standard            |        | •     |      |         |       |       |     |     |
| `adblock-internals`                                      | Standard            |        | •     |      |         |       |       |     |     |
| `adblock-popup`                                          | Standard            |        |       |      |         |       | •     |     |     |
| `address-bar-dropdown`                                   | Standard            |        |       |      |         | •     |       |     |     |
| `agent-internals`                                        | Standard            |        |       | •    |         |       |       |     |     |
| `ai-mode-bar`                                            | Standard            |        |       |      |         | •     |       |     |     |
| `app-service-internals`                                  | Standard            | •      | •     | •    | •       |       | •     | •   | •   |
| `app-settings`                                           | Standard            | •      | •     |      | •       |       | •     | •   | •   |
| `application-guard-internals`                            | Standard            |        |       | •    |         |       |       |     |     |
| `apps`                                                   | Standard            | •      | •     | •    | •       |       | •     | •   | •   |
| `assistant`                                              | Standard            |        |       |      |         |       |       |     | •   |
| `attribution-internals`                                  | Standard            |        |       |      |         | •     | •     | •   |     |
| `autofill-internals`                                     | Standard            | •      | •     | •    | •       | •     | •     | •   | •   |
| `autofill-ml-internals`                                  | Internal debugging  | •      | •     |      | •       |       | •     | •   | •   |
| `badcastcrash`                                           | Crash/debug command | •      | •     | •    | •       | •     | •     | •   | •   |
| `batch-upload`                                           | Standard            | •      | •     |      | •       |       | •     | •   | •   |
| `blob-internals`                                         | Standard            | •      | •     | •    | •       | •     | •     | •   | •   |
| `bluetooth-internals`                                    | Standard            | •      | •     | •    | •       | •     | •     | •   | •   |
| `bookmarks`                                              | Standard            | •      | •     |      | •       | •     | •     | •   | •   |
| `bookmarks-panel`                                        | Standard            |        |       |      |         | •     |       |     |     |
| `bookmarks-side-panel.top-chrome`                        | Standard            | •      | •     |      | •       |       | •     | •   | •   |
| `boost`                                                  | Internal debugging  |        |       |      |         |       |       | •   |     |
| `brave-shields.top-chrome`                               | Standard            |        | •     |      |         |       |       |     |     |
| `brave-speedreader.top-chrome`                           | Standard            |        | •     |      |         |       |       |     |     |
| `browser-switch`                                         | Standard            | •      | •     |      | •       |       | •     | •   | •   |
| `browserjs`                                              | Standard            |        |       |      |         | •     |       |     |     |
| `cast-feedback`                                          | Standard            | •      |       |      |         |       |       |     |     |
| `certificate-manager`                                    | Standard            | •      | •     |      | •       | •     | •     | •   | •   |
| `chrome`                                                 | Standard            |        |       |      |         |       | •     |     |     |
| `chrome-finds-internals`                                 | Internal debugging  | •      | •     | •    | •       |       |       | •   | •   |
| `chrome-signin`                                          | Standard            |        |       |      |         |       | •     |     |     |
| `chrome-untrusted://ai-overlay-dialog`                   | Untrusted context   | •      | •     |      | •       |       |       | •   | •   |
| `chrome-untrusted://aichat-chart-display`                | Untrusted context   |        | •     |      |         |       |       |     |     |
| `chrome-untrusted://aichat-code-sandbox`                 | Untrusted context   |        | •     |      |         |       |       |     |     |
| `chrome-untrusted://compose`                             | Untrusted context   | •      | •     |      | •       |       | •     | •   | •   |
| `chrome-untrusted://data-sharing`                        | Untrusted context   | •      | •     |      | •       |       | •     | •   | •   |
| `chrome-untrusted://dia-artifacts`                       | Untrusted context   |        |       |      |         |       |       | •   | •   |
| `chrome-untrusted://drive-picker-host`                   | Untrusted context   | •      | •     |      | •       |       |       | •   | •   |
| `chrome-untrusted://glic`                                | Untrusted context   | •      | •     |      |         |       |       |     |     |
| `chrome-untrusted://ledger-bridge`                       | Untrusted context   |        | •     |      |         |       |       |     |     |
| `chrome-untrusted://lens`                                | Untrusted context   | •      | •     |      | •       |       | •     |     |     |
| `chrome-untrusted://lens-overlay`                        | Untrusted context   | •      | •     |      | •       |       | •     |     |     |
| `chrome-untrusted://leo-ai-conversation-entries`         | Untrusted context   |        | •     |      |         |       |       |     |     |
| `chrome-untrusted://line-chart-display`                  | Untrusted context   |        | •     |      |         |       |       |     |     |
| `chrome-untrusted://market-display`                      | Untrusted context   |        | •     |      |         |       |       |     |     |
| `chrome-untrusted://news`                                | Untrusted context   |        | •     |      |         |       |       |     |     |
| `chrome-untrusted://nft-display`                         | Untrusted context   |        | •     |      |         |       |       |     |     |
| `chrome-untrusted://ntp-microsoft-auth`                  | Untrusted context   | •      | •     |      | •       |       | •     | •   | •   |
| `chrome-untrusted://print`                               | Untrusted context   | •      | •     |      | •       | •     | •     | •   | •   |
| `chrome-untrusted://privacy-sandbox-dialog`              | Untrusted context   |        |       |      |         |       | •     |     |     |
| `chrome-untrusted://read-anything-side-panel.top-chrome` | Untrusted context   | •      | •     |      | •       |       | •     | •   | •   |
| `chrome-untrusted://trezor-bridge`                       | Untrusted context   |        | •     |      |         |       |       |     |     |
| `chrome-untrusted://vpn-panel.top-chrome`                | Untrusted context   |        | •     |      |         |       |       |     |     |
| `chrome-urls`                                            | Standard            | •      | •     |      | •       | •     | •     | •   | •   |
| `color-pipeline-internals`                               | Internal debugging  | •      | •     |      | •       |       | •     | •   | •   |
| `comments-side-panel.top-chrome`                         | Standard            | •      | •     |      | •       |       | •     | •   | •   |
| `commerce-internals`                                     | Internal debugging  | •      | •     | •    | •       |       | •     | •   | •   |
| `compare`                                                | Standard            |        |       |      |         |       | •     |     |     |
| `compat`                                                 | Standard            |        |       | •    |         |       |       |     |     |
| `components`                                             | Standard            | •      | •     | •    | •       | •     | •     | •   | •   |
| `connection-help`                                        | Standard            | •      | •     |      | •       | •     | •     | •   | •   |
| `connection-monitoring-detected`                         | Standard            | •      | •     |      | •       | •     | •     | •   | •   |
| `connectors-internals`                                   | Standard            | •      | •     | •    | •       |       | •     | •   | •   |
| `consent-flow-dialog`                                    | Standard            |        |       |      |         | •     |       |     |     |
| `constrained-test`                                       | Standard            | •      | •     |      | •       | •     |       | •   | •   |
| `content-annotator-internals`                            | Internal debugging  | •      | •     |      | •       |       |       | •   | •   |
| `content-settings`                                       | Internal debugging  |        |       |      |         |       |       |     | •   |
| `context-hub`                                            | Internal debugging  | •      | •     |      | •       |       |       | •   | •   |
| `contextual-cueing-internals`                            | Internal debugging  | •      | •     | •    | •       |       |       | •   | •   |
| `contextual-tasks`                                       | Standard            | •      | •     |      | •       |       | •     |     |     |
| `crash`                                                  | Crash/debug command | •      | •     | •    | •       | •     | •     | •   | •   |
| `crash/browser/heap-overflow`                            | Crash/debug command | •      | •     | •    | •       | •     |       | •   | •   |
| `crash/browser/heap-underflow`                           | Crash/debug command | •      | •     | •    | •       | •     |       | •   | •   |
| `crash/browser/member-dereference-after-free`            | Crash/debug command | •      | •     | •    | •       | •     |       | •   | •   |
| `crash/browser/use-after-free`                           | Crash/debug command | •      | •     | •    | •       | •     |       | •   | •   |
| `crash/gpu/heap-overflow`                                | Crash/debug command | •      | •     | •    | •       | •     |       | •   | •   |
| `crash/gpu/heap-underflow`                               | Crash/debug command | •      | •     | •    | •       | •     |       | •   | •   |
| `crash/gpu/member-dereference-after-free`                | Crash/debug command | •      | •     | •    | •       | •     |       | •   | •   |
| `crash/gpu/use-after-free`                               | Crash/debug command | •      | •     | •    | •       | •     |       | •   | •   |
| `crash/renderer/heap-overflow`                           | Crash/debug command | •      | •     | •    | •       | •     |       | •   | •   |
| `crash/renderer/heap-underflow`                          | Crash/debug command | •      | •     | •    | •       | •     |       | •   | •   |
| `crash/renderer/member-dereference-after-free`           | Crash/debug command | •      | •     | •    | •       | •     |       | •   | •   |
| `crash/renderer/use-after-free`                          | Crash/debug command | •      | •     | •    | •       | •     |       | •   | •   |
| `crash/rust`                                             | Crash/debug command | •      | •     | •    | •       | •     | •     | •   | •   |
| `crashdump`                                              | Crash/debug command | •      | •     | •    | •       | •     | •     | •   | •   |
| `crashes`                                                | Standard            | •      | •     | •    | •       | •     | •     | •   | •   |
| `credits`                                                | Standard            | •      | •     | •    | •       | •     | •     | •   | •   |
| `cross-device-signin-qr-bubble`                          | Standard            | •      | •     | •    | •       |       |       | •   | •   |
| `customize-chrome-side-panel.top-chrome`                 | Standard            | •      | •     |      | •       |       | •     | •   | •   |
| `data-sharing-internals`                                 | Internal debugging  | •      | •     |      | •       |       | •     | •   | •   |
| `data-viewer`                                            | Standard            |        |       | •    |         |       |       |     |     |
| `debug-webuis-disabled`                                  | Standard            | •      | •     |      | •       | •     | •     | •   | •   |
| `default-browser-modal`                                  | Standard            | •      | •     |      |         |       |       | •   | •   |
| `device-log`                                             | Standard            | •      | •     | •    | •       |       | •     | •   | •   |
| `dino`                                                   | Standard            | •      | •     |      | •       | •     | •     | •   | •   |
| `discards`                                               | Internal debugging  | •      | •     | •    | •       | •     | •     | •   | •   |
| `download-internals`                                     | Internal debugging  | •      | •     | •    | •       |       | •     | •   | •   |
| `downloads`                                              | Standard            | •      | •     | •    | •       | •     | •     | •   | •   |
| `drive-picker-host`                                      | Standard            | •      | •     |      | •       |       |       | •   | •   |
| `easy-files`                                             | Standard            |        |       |      |         | •     |       |     |     |
| `easy-setup`                                             | Standard            |        |       |      |         | •     |       |     |     |
| `edge-dlp-internals`                                     | Standard            |        |       | •    |         |       |       |     |     |
| `edge-urls`                                              | Standard            |        |       | •    |         |       |       |     |     |
| `emoji-picker`                                           | Standard            |        |       |      |         | •     |       |     |     |
| `enp`                                                    | Standard            |        |       | •    |         |       |       |     |     |
| `eppo-features`                                          | Standard            |        |       |      |         |       | •     |     |     |
| `extensions`                                             | Standard            | •      | •     | •    | •       | •     | •     | •   | •   |
| `extensions-internals`                                   | Standard            | •      | •     | •    | •       | •     | •     | •   | •   |
| `extensions-zero-state`                                  | Standard            | •      | •     |      | •       |       | •     | •   | •   |
| `family-link-user-internals`                             | Internal debugging  | •      | •     |      | •       |       | •     | •   | •   |
| `favorites`                                              | Standard            |        |       | •    |         |       |       |     |     |
| `feature-showcase`                                       | Standard            | •      | •     |      | •       |       |       | •   | •   |
| `feedback`                                               | Standard            | •      | •     |      | •       | •     | •     | •   | •   |
| `flags`                                                  | Standard            | •      | •     | •    | •       | •     | •     | •   | •   |
| `gcm-internals`                                          | Standard            | •      | •     |      | •       | •     | •     | •   | •   |
| `getting-started`                                        | Standard            |        | •     |      |         |       |       |     |     |
| `glic`                                                   | Standard            | •      | •     |      |         |       | •     |     |     |
| `glic-experimental-opt-in`                               | Standard            | •      | •     |      |         |       |       |     |     |
| `glic-fre`                                               | Standard            |        |       |      |         |       | •     |     |     |
| `gpu`                                                    | Standard            | •      | •     | •    | •       | •     | •     | •   | •   |
| `gpuclean`                                               | Crash/debug command | •      | •     | •    | •       | •     | •     | •   | •   |
| `gpucrash`                                               | Crash/debug command | •      | •     | •    | •       | •     | •     | •   | •   |
| `gpuhang`                                                | Crash/debug command | •      | •     | •    | •       | •     | •     | •   | •   |
| `hang`                                                   | Crash/debug command | •      | •     | •    | •       | •     | •     | •   | •   |
| `help`                                                   | Standard            |        |       | •    |         |       |       |     |     |
| `histograms`                                             | Standard            | •      | •     | •    | •       | •     | •     | •   | •   |
| `history`                                                | Standard            | •      | •     | •    | •       | •     | •     | •   | •   |
| `history-clusters-internals`                             | Internal debugging  | •      | •     | •    | •       |       | •     | •   | •   |
| `history-clusters-side-panel.top-chrome`                 | Standard            | •      | •     |      | •       |       | •     | •   | •   |
| `history-panel`                                          | Standard            |        |       |      |         | •     |       |     |     |
| `history-side-panel.top-chrome`                          | Standard            | •      | •     |      | •       |       | •     | •   | •   |
| `history-sync-optin`                                     | Standard            | •      | •     |      | •       |       | •     | •   | •   |
| `indexeddb-internals`                                    | Standard            | •      | •     | •    | •       | •     | •     | •   | •   |
| `indigo-internals`                                       | Internal debugging  | •      | •     |      | •       |       |       | •   | •   |
| `inducebrowsercrashforrealz`                             | Crash/debug command | •      | •     | •    | •       | •     | •     | •   | •   |
| `inducebrowserdcheckforrealz`                            | Crash/debug command | •      | •     | •    | •       | •     | •     | •   | •   |
| `infobar-internals`                                      | Internal debugging  | •      | •     |      | •       |       | •     | •   | •   |
| `injection-protection`                                   | Standard            |        |       |      |         | •     |       |     |     |
| `inspect`                                                | Standard            | •      | •     | •    | •       | •     | •     | •   | •   |
| `internals`                                              | Standard            | •      | •     |      | •       |       | •     | •   | •   |
| `interstitials`                                          | Internal debugging  | •      | •     | •    | •       | •     | •     | •   | •   |
| `intro`                                                  | Standard            | •      | •     |      | •       |       | •     | •   | •   |
| `iwa-dev`                                                | Standard            | •      | •     | •    | •       |       |       |     | •   |
| `kill`                                                   | Crash/debug command | •      | •     | •    | •       | •     | •     | •   | •   |
| `legion-internals`                                       | Internal debugging  |        |       |      |         |       | •     |     |     |
| `leo-ai`                                                 | Standard            |        | •     |      |         |       |       |     |     |
| `local-state`                                            | Internal debugging  | •      | •     | •    | •       | •     | •     | •   | •   |
| `location-internals`                                     | Internal debugging  | •      | •     |      | •       | •     | •     | •   | •   |
| `mam-internals`                                          | Standard            |        |       | •    |         |       |       |     |     |
| `managed-user-profile-notice`                            | Standard            | •      | •     |      | •       |       |       | •   | •   |
| `management`                                             | Standard            | •      | •     | •    | •       |       | •     | •   | •   |
| `media-engagement`                                       | Standard            | •      | •     | •    | •       | •     | •     | •   | •   |
| `media-internals`                                        | Standard            | •      | •     | •    | •       | •     | •     | •   | •   |
| `media-router-internals`                                 | Internal debugging  | •      | •     |      | •       | •     | •     | •   | •   |
| `memory-exhaust`                                         | Crash/debug command | •      | •     | •    | •       | •     | •     | •   | •   |
| `memory-internals`                                       | Internal debugging  | •      | •     |      | •       | •     | •     | •   | •   |
| `memory-pressure-critical`                               | Crash/debug command | •      | •     | •    | •       | •     | •     | •   | •   |
| `memory-pressure-moderate`                               | Crash/debug command | •      | •     | •    | •       | •     | •     | •   | •   |
| `metrics-internals`                                      | Standard            | •      | •     | •    | •       |       | •     | •   | •   |
| `mods`                                                   | Standard            |        |       |      |         | •     |       |     |     |
| `multistep-filter-internals`                             | Internal debugging  | •      | •     |      | •       |       |       | •   | •   |
| `native-bookmarks`                                       | Standard            |        |       |      |         |       |       |     | •   |
| `net-export`                                             | Standard            | •      | •     | •    | •       | •     | •     | •   | •   |
| `net-internals`                                          | Standard            | •      | •     | •    | •       | •     | •     | •   | •   |
| `network-errors`                                         | Internal debugging  | •      | •     | •    | •       | •     | •     | •   | •   |
| `new-tab-page`                                           | Standard            | •      | •     |      | •       |       | •     | •   | •   |
| `new-tab-page-third-party`                               | Standard            | •      | •     |      | •       |       | •     | •   | •   |
| `news`                                                   | Standard            |        |       |      |         | •     |       |     |     |
| `newtab`                                                 | Standard            | •      | •     | •    | •       |       | •     | •   | •   |
| `newtab-footer`                                          | Standard            | •      | •     |      | •       |       | •     | •   | •   |
| `notebooks-internals`                                    | Internal debugging  | •      | •     |      | •       |       |       |     | •   |
| `ntp-tiles-internals`                                    | Standard            | •      | •     | •    | •       |       | •     | •   | •   |
| `omnibox`                                                | Internal debugging  | •      | •     | •    | •       |       | •     | •   | •   |
| `omnibox-everywhere.top-chrome`                          | Standard            | •      | •     |      | •       |       |       | •   | •   |
| `omnibox-popup.top-chrome`                               | Standard            | •      | •     |      | •       |       | •     | •   | •   |
| `on-device-internals`                                    | Internal debugging  | •      | •     | •    | •       |       | •     | •   | •   |
| `on-device-translation-internals`                        | Standard            | •      | •     |      | •       |       | •     | •   | •   |
| `opera-account`                                          | Standard            |        |       |      |         | •     |       |     |     |
| `opera-diagnostics`                                      | Standard            |        |       |      |         | •     |       |     |     |
| `optimization-guide-internals`                           | Internal debugging  | •      | •     | •    | •       |       | •     | •   | •   |
| `organizer-panel.top-chrome`                             | Standard            |        |       |      |         |       |       |     | •   |
| `password-manager`                                       | Standard            | •      | •     |      | •       | •     | •     | •   | •   |
| `password-manager-internals`                             | Standard            | •      | •     | •    | •       | •     | •     | •   | •   |
| `perplexity-onboarding`                                  | Standard            |        |       |      |         |       | •     |     |     |
| `perplexity-spotlight`                                   | Standard            |        |       |      |         |       | •     |     |     |
| `personal-context-internals`                             | Internal debugging  | •      | •     |      | •       |       |       | •   |     |
| `personal-context-notice`                                | Standard            | •      | •     |      | •       |       |       | •   |     |
| `player-service`                                         | Standard            |        |       |      |         | •     |       |     |     |
| `policy`                                                 | Standard            | •      | •     | •    | •       |       | •     | •   | •   |
| `predictors`                                             | Standard            | •      | •     | •    | •       | •     | •     | •   | •   |
| `prefs-internals`                                        | Standard            | •      | •     | •    | •       | •     |       | •   | •   |
| `print`                                                  | Standard            | •      | •     | •    | •       | •     | •     | •   | •   |
| `privacy-sandbox-dialog`                                 | Standard            |        |       |      |         |       | •     |     |     |
| `privacy-sandbox-internals`                              | Standard            |        |       |      |         |       | •     |     |     |
| `private-aggregation-internals`                          | Standard            |        |       |      |         | •     | •     | •   |     |
| `private-ai-internals`                                   | Internal debugging  | •      | •     |      | •       |       |       | •   | •   |
| `process-internals`                                      | Standard            | •      | •     | •    | •       | •     | •     | •   | •   |
| `profile-customization`                                  | Standard            | •      | •     |      | •       |       | •     | •   | •   |
| `profile-internals`                                      | Internal debugging  | •      | •     | •    | •       | •     | •     | •   | •   |
| `profile-picker`                                         | Standard            | •      | •     |      | •       |       | •     | •   | •   |
| `psst`                                                   | Standard            |        | •     |      |         |       |       |     |     |
| `push-internals`                                         | Standard            |        |       | •    |         |       |       |     |     |
| `quit`                                                   | Crash/debug command | •      | •     | •    | •       | •     | •     | •   | •   |
| `quota-internals`                                        | Standard            | •      | •     | •    | •       | •     | •     | •   | •   |
| `read-later.top-chrome`                                  | Standard            | •      | •     |      | •       |       | •     | •   | •   |
| `regional-capabilities-internals`                        | Internal debugging  | •      | •     |      | •       |       | •     | •   | •   |
| `reset-password`                                         | Standard            | •      | •     |      | •       |       | •     | •   | •   |
| `restart`                                                | Crash/debug command | •      | •     | •    | •       | •     | •     | •   | •   |
| `rewards.top-chrome`                                     | Standard            |        | •     |      |         |       |       |     |     |
| `rich-hints-console`                                     | Standard            |        |       |      |         | •     |       |     |     |
| `rich-wallpaper`                                         | Standard            |        |       |      |         | •     |       |     |     |
| `safe-browsing`                                          | Internal debugging  | •      | •     |      | •       | •     | •     | •   | •   |
| `saved-tab-groups-unsupported`                           | Standard            | •      | •     |      | •       |       | •     | •   | •   |
| `search-engine-choice`                                   | Standard            | •      | •     |      | •       |       | •     | •   | •   |
| `security-diagnostics`                                   | Standard            |        |       | •    |         |       |       |     |     |
| `segmentation-internals`                                 | Standard            | •      | •     |      | •       |       | •     | •   | •   |
| `serviceworker-internals`                                | Standard            | •      | •     | •    | •       | •     | •     | •   | •   |
| `settings`                                               | Standard            | •      | •     | •    | •       | •     | •     | •   | •   |
| `settings-one`                                           | Standard            |        |       |      |         | •     |       |     |     |
| `sharing-point`                                          | Standard            |        |       |      |         | •     |       |     |     |
| `shopping-insights-side-panel.top-chrome`                | Standard            | •      | •     |      | •       |       | •     | •   | •   |
| `shorthang`                                              | Crash/debug command | •      | •     | •    | •       | •     | •     | •   | •   |
| `sidebar`                                                | Standard            |        |       |      |         |       | •     |     |     |
| `sidebar-setup`                                          | Standard            |        |       |      |         | •     |       |     |     |
| `signin-dice-web-intercept.top-chrome`                   | Standard            | •      | •     |      | •       |       | •     | •   | •   |
| `signin-email-confirmation`                              | Standard            | •      | •     |      | •       |       | •     | •   | •   |
| `signin-error`                                           | Standard            | •      | •     |      | •       |       | •     | •   | •   |
| `signin-internals`                                       | Standard            | •      | •     | •    | •       |       | •     | •   | •   |
| `signin-qrcode-bar`                                      | Standard            |        |       |      |         |       |       | •   |     |
| `signout-confirmation`                                   | Standard            | •      | •     |      | •       |       | •     | •   | •   |
| `site-engagement`                                        | Standard            | •      | •     | •    | •       | •     | •     | •   | •   |
| `skills`                                                 | Standard            | •      | •     | •    | •       |       |       |     |     |
| `snapshot-selfie`                                        | Standard            |        |       |      |         | •     |       |     |     |
| `start-page`                                             | Standard            |        |       |      |         |       |       |     | •   |
| `startpage`                                              | Standard            |        |       |      |         | •     |       |     |     |
| `startpageshared`                                        | Standard            |        |       |      |         | •     |       |     |     |
| `styleguide`                                             | Standard            |        |       |      |         | •     |       |     |     |
| `subresource-filter-internals`                           | Internal debugging  | •      | •     | •    | •       |       |       | •   | •   |
| `suggest-internals`                                      | Standard            | •      | •     | •    | •       |       | •     | •   | •   |
| `support-tool`                                           | Standard            | •      | •     |      | •       |       | •     | •   | •   |
| `sync-confirmation`                                      | Standard            | •      | •     |      | •       |       | •     | •   | •   |
| `sync-internals`                                         | Standard            | •      | •     | •    | •       | •     | •     | •   | •   |
| `sync-login`                                             | Standard            |        |       |      |         | •     |       |     |     |
| `system`                                                 | Standard            | •      | •     | •    | •       | •     | •     | •   | •   |
| `tab-group-home`                                         | Standard            | •      | •     |      | •       |       | •     | •   | •   |
| `tab-search.top-chrome`                                  | Standard            | •      | •     | •    | •       |       | •     | •   | •   |
| `tab-strip-internals`                                    | Internal debugging  | •      | •     |      | •       |       | •     | •   | •   |
| `tabs-from-other-devices.top-chrome`                     | Standard            | •      | •     | •    | •       |       |       | •   | •   |
| `terms`                                                  | Standard            | •      | •     | •    | •       |       | •     | •   | •   |
| `themes`                                                 | Standard            |        |       |      |         | •     |       |     |     |
| `topics-internals`                                       | Standard            |        |       |      |         |       | •     | •   |     |
| `traces`                                                 | Standard            | •      | •     |      | •       | •     | •     | •   | •   |
| `traces-internals`                                       | Standard            | •      | •     |      | •       | •     | •     | •   | •   |
| `tracing`                                                | Internal debugging  | •      | •     | •    | •       | •     | •     | •   | •   |
| `translate-internals`                                    | Standard            | •      | •     | •    | •       |       | •     | •   | •   |
| `uithreadhang`                                           | Crash/debug command | •      | •     | •    | •       | •     |       | •   | •   |
| `ukm`                                                    | Internal debugging  | •      | •     | •    | •       | •     | •     | •   | •   |
| `unexportable-keys-internals`                            | Internal debugging  | •      | •     |      | •       | •     | •     | •   | •   |
| `update`                                                 | Standard            |        |       |      |         | •     |       |     |     |
| `updater`                                                | Standard            | •      | •     | •    | •       |       | •     | •   | •   |
| `usb-internals`                                          | Standard            | •      | •     | •    | •       | •     | •     | •   | •   |
| `user-actions`                                           | Internal debugging  | •      | •     | •    | •       |       | •     | •   | •   |
| `user-education-internals`                               | Internal debugging  | •      | •     |      | •       |       | •     | •   | •   |
| `version`                                                | Standard            | •      | •     | •    | •       | •     | •     | •   | •   |
| `video-conference-detached`                              | Standard            |        |       |      |         | •     |       |     |     |
| `view-cert`                                              | Standard            | •      | •     |      | •       | •     | •     | •   | •   |
| `vpn-pro`                                                | Standard            |        |       |      |         | •     |       |     |     |
| `wallet`                                                 | Standard            |        | •     | •    |         |       |       |     |     |
| `wallet-panel.top-chrome`                                | Standard            |        | •     |      |         |       |       |     |     |
| `wallet/passwords`                                       | Standard            |        |       | •    |         |       |       |     |     |
| `watermark`                                              | Standard            | •      | •     |      | •       |       | •     | •   | •   |
| `web-app-internals`                                      | Standard            | •      | •     | •    | •       |       | •     | •   | •   |
| `web3-selector`                                          | Standard            |        |       |      |         | •     |       |     |     |
| `webcompat`                                              | Standard            |        | •     |      |         |       |       |     |     |
| `webnn-internals`                                        | Standard            | •      | •     | •    | •       | •     |       | •   | •   |
| `webrtc-internals`                                       | Standard            | •      | •     | •    | •       | •     | •     | •   | •   |
| `webrtc-logs`                                            | Internal debugging  | •      | •     | •    | •       |       | •     | •   | •   |
| `webui-browser`                                          | Standard            | •      | •     | •    | •       |       | •     |     |     |
| `webui-gallery`                                          | Internal debugging  | •      | •     |      | •       |       | •     | •   | •   |
| `webui-toolbar.top-chrome`                               | Standard            | •      | •     | •    | •       |       | •     | •   | •   |
| `webuijserror`                                           | Crash/debug command | •      | •     | •    | •       | •     | •     | •   | •   |
| `welcome-new`                                            | Standard            |        | •     |      |         |       |       |     |     |
| `whats-new`                                              | Standard            | •      | •     |      | •       |       | •     | •   | •   |
| `workspaces-internals`                                   | Standard            |        |       | •    |         |       |       |     |     |
| `wormhole`                                               | Standard            |        |       |      |         |       | •     |     |     |

## Removed URLs

Shipped by earlier versions of this extension and advertised by no browser in the census.
Each was additionally verified by navigating to it in Chrome 152, where it returns a network error.
They remain in `paths.ts` marked `isDeprecated`, hidden behind the _Hide Removed URLs_ preference.

| URL                             | Why it is gone                                                                                                                                                                                       |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `appcache-internals`            | AppCache was removed from Chromium in Chrome 95. Service worker state now lives at chrome://serviceworker-internals.                                                                                 |
| `assistant-optin`               | Google Assistant was a ChromeOS-only surface and is no longer registered in desktop builds.                                                                                                          |
| `conversion-internals`          | Renamed to chrome://attribution-internals, which itself has since been dropped by Chrome, Brave, Dia, Edge and Vivaldi along with the Privacy Sandbox Ads APIs. Arc, Comet and Opera still carry it. |
| `devices`                       | Removed from Chromium. Cast device state now lives at chrome://media-router-internals.                                                                                                               |
| `internals/gpu`                 | An Android-only surface. Desktop builds serve chrome://gpu instead.                                                                                                                                  |
| `internals/media`               | An Android-only surface. Desktop builds serve chrome://media-internals instead.                                                                                                                      |
| `internals/query-tiles`         | An Android-only surface with no desktop equivalent.                                                                                                                                                  |
| `invalidations`                 | Removed from Chromium. Sync invalidation state is now reported under chrome://sync-internals.                                                                                                        |
| `privacy-sandbox-dialog/?debug` | The ?debug parameter is gone. Chrome dropped the consent dialog itself alongside the Privacy Sandbox Ads APIs; only Comet still serves chrome://privacy-sandbox-dialog.                              |
| `skills-manager`                | Folded into chrome://skills.                                                                                                                                                                         |
| `suggestions`                   | Removed from Chromium. The New Tab Page now renders suggestions directly.                                                                                                                            |

## Entries not derived from the census

Six commands are not advertised on any browser's `chrome://chrome-urls` page, so the census could not
establish their support. Their support sets come from the methods below instead. They are listed here
because a support set is a claim, and a reader is entitled to know which claims were measured.

**Measured by direct navigation** — each browser was launched on a throwaway profile, sent to the
address, and the resulting location recorded (macOS, 2026-09-15). A browser is listed only if it
actually resolved the page. Brave, Arc and Dia canonicalise these to the `chrome://` form and load
them, which counts as serving them.

| URL                         | Verified in                                                                                                 | Not verified                |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------- |
| `about`                     | Chrome, Brave, Arc, Dia — plus Edge and Opera, which list it in the census                                  | Comet, Vivaldi              |
| `help`                      | Chrome, Brave, Arc, Dia — plus Edge, which lists it in the census                                           | Comet, Opera, Vivaldi       |
| `interstitials/ssl`         | Chrome, Brave, Arc, Dia — plus Comet, which answered with its debug-disabled page, so the host exists there | Edge, Opera, Vivaldi        |
| `internals/session-service` | Chrome, Brave, Arc, Dia                                                                                     | Comet, Edge, Opera, Vivaldi |

Edge, Opera and Vivaldi were not installed at the time of this pass. Comet's probe returned
`about:blank` for every address except the one above, which means the navigation did not complete
rather than that the page is absent — so Comet is treated as unmeasured, not unsupported.

**Source-derived, not measured** — `conflicts` and `sandbox` are gated to Windows and Windows/Linux
respectively in Chromium's `chrome/common/webui_url_constants.cc`. Every browser tested returns a
network error for them on macOS, so nothing about them is measurable on the platform this census ran
on. Their support is narrowed to Chrome, the one browser whose upstream source declares the host.
Other Chromium browsers may well serve them on Windows; that has not been verified here and is not
claimed.
