# UniFi API Coverage

Reviewed on 2026-09-15 against the complete official `llms.txt` index and each linked OpenAPI document.

## Documentation Inventory

| Service        | Documentation release | Paths | Operations | GET operations | Extension coverage                                                                                    |
| -------------- | --------------------: | ----: | ---------: | -------------: | ----------------------------------------------------------------------------------------------------- |
| Network        |               10.4.57 |    44 |         73 |             41 | First-class overview, device/client views, 23 read resources, restart, port power-cycle client method |
| Protect        |                7.3.53 |    55 |         74 |             38 | First-class browser, 17 read resources, snapshots, siren/PTZ/relay/alarm/arm actions                  |
| Mobility       |                 1.0.0 |     7 |          8 |              5 | Four read collections, including workspace drill-down                                                 |
| InnerSpace     |                1.3.23 |     6 |          6 |              6 | Five JSON read resources                                                                              |
| Site Manager   |                 1.0.0 |    10 |         14 |              9 | Five read resources                                                                                   |
| Carrier Fabric |                 1.0.0 |     8 |         11 |              4 | Two read collections                                                                                  |

The Protect OpenAPI document reports `info.version: 0.0.0` although its published route and UniFi documentation index identify release `7.3.53`. The InnerSpace document similarly reports `info.version: 1` while its published route is `1.3.23`. The extension uses the published documentation releases and records these contradictions instead of silently normalizing them.

## Exposed Read Surface

The allowlist in `src/api/resources.ts` covers collection-style JSON resources that work well in a searchable Raycast list and AI response:

- Network: sites, pending and adopted devices, clients, networks, Wi-Fi broadcasts, vouchers, firewall policies and zones, ACL rules, LAGs, MC-LAG domains, switch stacks, DNS policies, traffic matching lists, device tags, RADIUS profiles, VPN servers and tunnels, WANs, countries, and DPI applications/categories.
- Protect: viewers, live views, arm profiles, lights, cameras, sensors, sirens, fobs, relays, speakers, bridges, link stations, alarm hubs, NVR, chimes, users, and Identity users.
- Platform: Site Manager hosts/sites/devices/SD-WAN/ISP metrics; Mobility workspaces/admins/devices/clients; InnerSpace project/floor plans/access points/switches/inventory; Carrier subscribers/service plans.

Resource keys are explicit and fail closed. Arbitrary paths cannot be supplied through Raycast AI.

## Exposed Mutations

Only bounded operational actions are exposed:

- Network device restart.
- Network switch-port PoE power cycle in the API client.
- Protect siren play/stop/test.
- Protect camera PTZ preset/patrol control.
- Protect relay output activation.
- Protect alarm-hub output trigger.
- Protect arm/disarm.

Raycast AI mutations declare dynamic confirmation screens. The UI also confirms actions that can interrupt service or operate physical hardware. POST requests are not retried automatically, preventing accidental duplicate actions after ambiguous failures.

## Deliberate Exclusions

- Create, update, reorder, adopt, unadopt, and delete configuration operations are not exposed. These require richer forms, reference validation, and recovery UX before they are safe in a launcher or AI tool.
- Permanent microphone disable, RTSPS stream lifecycle, talkback sessions, alarm-manager webhooks, asset uploads, and POS transaction ingestion are not exposed.
- Protect WebSocket subscriptions are not used. Raycast commands refresh on demand rather than keeping a background session alive.
- Binary InnerSpace asset downloads and parameterized detail endpoints remain outside the generic browser. First-class views call parameterized device and snapshot endpoints where needed.

## Validation State

- `observed`: TypeScript, unit tests, Raycast manifest validation, ESLint, Prettier, and the production build pass locally. Authenticated local-console checks covered site selection, the health overview, Network device and client lists, Protect camera inventory, camera snapshots, and problem drill-downs.
- `needs_evidence`: authenticated Cloud Connector runs, physical Protect action testing, and refreshed Raycast Store screenshots. Hardware-changing actions were not triggered during validation.
