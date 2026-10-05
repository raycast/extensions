# Companies House

Search the UK Companies House register from Raycast — look up companies and officers, read profiles, officers, filing history, charges, insolvency and significant control, and open or download the documents a company has actually filed.

> Unofficial extension. Not affiliated with or endorsed by Companies House.

## Setup

This extension uses the free Companies House Public Data API. You'll need your own API key:

1. Create a free account (or sign in) at the [Companies House developer dashboard](https://developer.company-information.service.gov.uk/manage-applications).
2. Register an application and create an **API key** (the REST "Live" key, not the Streaming key).
3. Paste it into the extension's **API Key** preference the first time you run a command.

The key stays on your machine. Nothing is proxied through a third party.

## Commands

- **Search Companies** — find a UK company by name or number, then open its profile. Recently viewed companies appear when the search box is empty.
- **Search Officers** — find a director or officer by name and see their appointments across every company.

## What you can read

- **Company profile** — status and any status detail such as a proposal to strike off, type, incorporation date, registered office, nature of business (SIC), and accounts and confirmation-statement dates.
- **Officers** — appointments with dates, nationality, occupation and correspondence address, filterable by name and by whether they are in post.
- **Filing history** — rendered with the official Companies House descriptions, with actions to open or download the filed document itself.
- **Charges** — mortgages and their status, dates and persons entitled.
- **Insolvency** — cases, their dated events, and the practitioners appointed.
- **Persons with significant control** — beneficial owners and their nature of control. When the register is empty, the extension says _why_: an exemption in force, a statement filed in its place, or a genuine gap.
- **Disqualified directors** — searchable by name, with the statutory reason, the disqualifying act, and the period.

## AI

This is an AI extension. With Raycast AI you can ask questions in natural language and it will call the right lookups:

- _"@companies-house is Monzo Bank still active and who are its directors?"_
- _"@companies-house who are the beneficial owners of company OC394454?"_
- _"@companies-house has this company ever been in administration?"_

## Notes on the data

- **Companies House does not verify what companies file.** This extension reports what is on the public register. It is not a credit check, an identity check, or any kind of clearance.
- **A name match is not proof of identity.** The disqualified directors register is searched by name, and different people share names. Check the date of birth and address before drawing a conclusion.
- **Ceased and resigned entries stay on the register.** Filters distinguish current from former, and counts come from the register's own totals rather than from whatever happened to load.
- **Rate limit:** the API allows 600 requests per five minutes per key. Searches are throttled and long lists are read a page at a time to stay within it.
- **Dates of birth.** For company officers, Companies House publishes only the **month and year**, and that is all this extension shows. The disqualified directors register is different: it publishes the **full date**, and the extension shows it, because it is the main way to tell two people of the same name apart.

## Data

- Contains public sector information from Companies House licensed under the [Open Government Licence v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/).
- Filing, company-type, status, officer-role, SIC, insolvency, exemption and disqualification descriptions are derived from the Companies House [`api-enumerations`](https://github.com/companieshouse/api-enumerations) reference data.
