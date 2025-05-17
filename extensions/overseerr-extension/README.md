# Overseerr Extension for Raycast

Manage your Overseerr requests directly from Raycast.  
Approve, decline, and review requests for movies and TV shows — all from the comfort of your keyboard.

## 🧩 Features

- View and search all Overseerr requests
- Filter pending requests
- Approve requests with interactive options:
  - Select **server/library**
  - Select **quality profile**
  - Select **root folder**
- Automatically display localized TMDB titles based on your preferred language
- Integrate directly with Sonarr to fetch quality profiles for TV requests
- Instant feedback with toast messages

## ⚙️ Configuration

Before using the extension, set the following preferences in Raycast:

| Preference            | Type     | Description                                                                                             |
|-----------------------|----------|---------------------------------------------------------------------------------------------------------|
| Overseerr Address     | Text     | Base URL of your Overseerr instance (e.g., http://localhost:5055). Don’t include /api/v1.              |
| Overseerr API Key     | Password | API key from Overseerr → Settings → API Key                                                             |
| TMDB API Key          | Password | Your TMDB API key. [Get one here](https://www.themoviedb.org/settings/api)                             |
| TMDB Language         | Text     | (Optional) Language code for TMDB titles (e.g., en, ko, ja). Defaults to en.                           |
| Sonarr Address        | Text     | (Optional) Base URL of your Sonarr instance (e.g., http://localhost:8989). Don’t include /api/v3.      |
| Sonarr API Key        | Password | (Optional) API key from Sonarr → Settings → General. Needed for quality profile selection in TV shows. |


> 📝 You can find and edit these fields in **Raycast → Extensions → Overseerr → Preferences**.

> ⚠️ `Sonarr API Key` is optional, but required to enable quality profile selection for TV show approvals. If not set, you can still approve requests, but profile selection will not be available.

## 🗝️ How to Get Your Overseerr API Key

1. Open your Overseerr web interface
2. Go to **Settings → API**
3. Copy the API Key and paste it into Raycast Preferences

## 🗝️ How to Get Your TMDB API Key

To display localized titles (e.g., English, Spanish, Korean, Japanese) for movies and shows, this extension uses The Movie Database (TMDB) API.

Follow these steps to obtain your TMDB API key:

1. Visit https://www.themoviedb.org/ and sign up or log in
2. Go to your account menu → Settings
3. Navigate to the API tab: https://www.themoviedb.org/settings/api
4. Scroll down to API Key (v3 auth) and copy the key
5. Paste this value into Raycast → Extensions → Overseerr → Preferences → TMDB API Key

## 🗝️ How to Get Your Sonarr API Key

To fetch available **TV quality profiles**, this extension integrates directly with your Sonarr instance.

1. Open Sonarr in your browser
2. Go to **Settings → General**
3. Scroll down to **Security → API Key**
4. Copy the key and paste it into Raycast → Extensions → Overseerr → Preferences → Sonarr API Key

## 🧪 API Permissions

Make sure the Overseerr API key is created by a user with **administrator privileges**.  
Otherwise, approving requests or fetching settings may fail.

## 🧠 Implementation Details

This extension is implemented entirely using TypeScript and the Raycast API.  
Key integrations include:

- **Overseerr API**:  
  Fetches the list of user requests and allows you to approve/decline them

- **TMDB API**:  
  Translates internal `tmdbId` values into localized human-readable movie/show titles

- **Sonarr API**:  
  When approving a **TV request**, it fetches available quality profiles via  
  `GET /api/v3/qualityprofile?apikey=...`  
  This enables rich approval options matching your actual Sonarr configuration

All external requests are authenticated using API keys set in the extension's preferences.

## 📂 Folder Structure
```
overseerr-extension/
├── assets/         # Icons used in the extension
├── media/          # Screenshots for README
├── src/
│   ├── index.tsx           # Manage Requests
│   ├── pending.tsx         # Pending Requests
│   ├── ApprovalForm.tsx    # Approval dialog
│   └── utils.ts            # Shared config and helpers
├── package.json
├── tsconfig.json
└── README.md
```
## 🧑‍💻 Author

Created by **cpm9662**
