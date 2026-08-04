# Companies House

Search the UK Companies House register from Raycast — look up companies and officers, and view profiles, officers, filing history and charges without leaving your keyboard.

> Unofficial extension. Not affiliated with or endorsed by Companies House.

## Setup

This extension uses the free Companies House Public Data API. You'll need your own API key:

1. Create a free account (or sign in) at the [Companies House developer dashboard](https://developer.company-information.service.gov.uk/manage-applications).
2. Register an application and create an **API key** (the REST "Live" key, not the Streaming key).
3. Copy the key and paste it into the extension's **API Key** preference the first time you run a command.

## Commands

- **Search Companies** — find a UK company by name or number, then open its profile to see status, registered office, nature of business, accounts and confirmation-statement dates, officers, filing history, charges and persons with significant control.
- **Search Officers** — find a director or officer by name and view their appointments across every company.

## Features

- Company profiles with status, type, incorporation date, registered office, SIC (nature of business) descriptions, and accounts/confirmation-statement due dates.
- Officers and directors with full appointment details, plus an officer's appointments across all companies.
- Filing history rendered with the official Companies House descriptions.
- Charges (mortgages) with status, dates and persons entitled.
- Persons with significant control (beneficial owners), with their nature of control.
- Filter officers by name and by status (active or resigned).
- Quick actions to open any record on the Companies House website or copy a company number.

## AI

This is an AI extension — with Raycast AI you can ask natural-language questions and it will call the right Companies House lookups for you, for example:

- _"@companies-house is Monzo Bank still active and who are its directors?"_
- _"@companies-house who are the beneficial owners of company OC394454?"_
- _"@companies-house what other companies is a given director involved in?"_

## Notes

- **Rate limit:** the Companies House API allows 600 requests per five minutes per key. The extension throttles searches and loads results one page at a time to stay well within this.
- **Privacy:** only an officer's birth **month and year** are ever shown — Companies House never publishes the day.

## Data

- Contains public sector information from Companies House licensed under the [Open Government Licence v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/).
- Filing, company-type, status, officer-role and SIC descriptions are derived from the Companies House [`api-enumerations`](https://github.com/companieshouse/api-enumerations) reference data.
