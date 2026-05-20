# Mail Finder

Find the verified email address of any professional.

## Setup

1. Get your API key from [Mail-Finder.org](https://mail-finder.org/)
2. Open Raycast and run any Mail Finder command
3. Enter your API key when prompted

## Commands

### Mail Finder

Search for a person's email by entering their first name, last name, and company domain.

### Company Employees Search

Browse employees at any company by domain. Filter by department and view detailed profiles with verified emails.

### Mail Finder History

View your past searches, rerun them, or clear your history.

## Third-Party Services

In addition to the Mail-Finder.org API, this extension makes unauthenticated calls to **Clearout** for company-name autocomplete:

- **Endpoint:** `https://api.clearout.io/public/companies/autocomplete`
- **Used by:** `searchCompanyByName` in `src/backend.ts`
- **Purpose:** Resolve a typed company name to a domain (and logo) so users can search without knowing the exact domain.
- **Auth / cost:** Public endpoint, no API key or credits required.
- **Data sent:** The query string the user types into the company field. No personal data or API keys are transmitted.
