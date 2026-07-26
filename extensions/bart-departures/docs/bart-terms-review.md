# BART Developer Terms Review

**Status:** Currently waiting on a response from BART Devs for approval to use BART in name
**Scope:** Public Raycast Store submission of this extension under its current
`BART Departures` name  
**Last reviewed:** 2026-07-26

This is an operational record for maintainers, not legal advice. It records
the conditions that must be resolved before this extension is submitted to the
Raycast Store.

## Authoritative sources

- [BART Developer License Agreement](https://www.bart.gov/schedules/developers/developer-license-agreement)
  (accessed 2026-07-26)
- [BART Legacy API](https://www.bart.gov/schedules/developers/api) (accessed
  2026-07-26)
- [BART API key registration](https://api.bart.gov/api/register.aspx)
  (accessed 2026-07-26)
- [Raycast: Prepare an Extension for Store](https://developers.raycast.com/basics/prepare-an-extension-for-store)
  (accessed 2026-07-26)

Recheck these sources before release because BART may alter its terms or
service without notice.

## Product inventory

| Surface        | Current behavior                                                                                                    | Review implication                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Public name    | The extension and its command are named `BART Departures`.                                                          | This is the primary unresolved trademark question.                                                                     |
| Data source    | Native `fetch` calls BART's Legacy API station-list (`stn.aspx`) and real-time departure (`etd.aspx`) endpoints.    | The extension uses and displays BART data at runtime.                                                                  |
| Displayed data | Station names, station abbreviations/cities, destinations, departure times, line colors, platforms, and directions. | Confirm that this display and any wording accurately represents the data.                                              |
| Local data     | Raycast `LocalStorage` retains the user's last selected station.                                                    | The extension does not intentionally publish or aggregate that local state.                                            |
| Credentials    | The current client module contains an embedded BART API credential.                                                 | Do not publish it; rotate it and move to a user-owned, required Raycast password preference before any public release. |
| Visuals        | The Store icon and screenshots are public-facing extension metadata.                                                | Use an original icon and screenshots; do not use a BART logo, system map, or confusingly official branding.            |
| Documentation  | The README describes the API integration.                                                                           | Add only BART-approved attribution, disclaimer, and link-back language after written approval.                         |

## Requirement map

| BART guidance                                                                                             | Required maintainer response                                                                                              | Status                        |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| The licence grants limited, revocable rights to use, reproduce, and redistribute BART data.               | Keep the review record current and avoid assuming permanent availability.                                                 | Open                          |
| The licence says BART trademarks and copyrighted materials may not be used in association with BART data. | Obtain explicit written permission for the `BART Departures` name before publishing under that name.                      | Blocked pending BART response |
| The Legacy API page says not to use the official BART logo or system map.                                 | Use original non-BART visuals; replace any branding that could imply official status.                                     | Required before release       |
| The Legacy API page asks developers to provide a shout-out or link back.                                  | Use the exact attribution/link-back language BART approves.                                                               | Blocked pending BART response |
| BART recommends GTFS and GTFS-RT as more up-to-date, supported standards.                                 | Ask whether Legacy API use is acceptable; do not migrate unless BART requires it or a later product decision approves it. | Open                          |
| BART may disable API keys.                                                                                | Use a user-owned registered key rather than a repository credential, and provide a clear configuration error.             | Required before release       |

## Release decision

**Decision:** Do not submit or publish this extension while BART's written
response is pending, negative, or materially ambiguous.

Approval must explicitly cover the BART-branded extension and command name,
the described display of Legacy API data, and any required attribution or
disclaimer. A link to the API documentation, use of a public API key, or lack
of a response is not permission.

Store the original BART response outside the repository because it may contain
personal contact information. Add only a redacted summary here after approval:

| Decision date | BART response reference | Conditions | Maintainer verification |
| ------------- | ----------------------- | ---------- | ----------------------- |
| Pending       | —                       | —          | —                       |

## Prepared BART feedback draft — do not send automatically

**Suggested subject:** Request for approval of third-party Raycast extension
name, attribution, and Legacy API use

> Hello BART Developer Program,
>
> I am preparing a free, open-source Raycast extension for possible submission
> to the Raycast Store. The proposed extension and command name is **BART
> Departures**. It would call BART's Legacy API at runtime to let a user choose
> a station and view real-time departure estimates. It displays station names,
> destinations, departure times, line colors, platforms, and directions.
>
> The extension would not include a BART logo or system map, would use original
> extension artwork, and would not aggregate or redistribute data outside the
> user's Raycast session. It would save only the user's last selected station
> locally. Before public release, each user would provide their own registered
> BART API key through Raycast preferences; no API key would be shipped in the
> source code.
>
> Could you please confirm in writing:
>
> 1. Whether **BART Departures** is permitted as the extension and command name.
> 2. The exact attribution, disclaimer, link-back, or branding language you
>    require.
> 3. Whether this Legacy API use and user-provided-key model are acceptable for
>    Raycast Store distribution.
> 4. Any other conditions that must appear in the extension, Store listing, or
>    documentation.
>
> I will not submit the extension until these points are resolved. Thank you for
> your guidance.

Use BART's [Developer Feedback form](https://www.bart.gov/schedules/developers/devfeedback)
only after a maintainer explicitly authorizes external outreach. Do not include
an API key, user data, or other confidential information in the request.

## Follow-through after an affirmative response

1. Record the response date, redacted reference, and every condition in the
   decision table above.
2. Apply all approved naming, attribution, and disclaimer requirements to the
   manifest, README, and Store assets.
3. Remove and rotate the embedded credential, then use a required user-owned
   Raycast password preference.
4. Verify that the icon, screenshots, and Store copy do not use official BART
   marks or maps and cannot imply an official BART product.
5. Re-review this document when BART changes its terms, the extension changes
   its branding or data handling, or it starts redistributing additional data.

If BART does not provide affirmative written approval, do not publish under the
current name. Start a separate product decision for a rename and/or data-source
change instead.
