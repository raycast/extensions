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
- Instant feedback with toast messages

## ⚙️ Configuration

Before using the extension, set the following preferences in Raycast

| Preference | Type | Description |
|-----------|------|-------------|
| `Overseerr Address` | Text | Base URL of your Overseerr instance (e.g., `http://localhost:5055`). Don't include `/api/v1` — it will be added automatically. |
| `Overseerr API Key` | Password | Your Overseerr API key. Found in **Settings → API Key** in Overseerr. |
| `TMDB API Key` | Password | A TMDB API key. [Get one here](https://www.themoviedb.org/settings/api). |
| `TMDB Language` | Text (Optional) | Desired language code for TMDB titles (e.g., `en`, `ko`, `ja`, `de`). Defaults to `en`. |

> 📝 You can find and edit these fields in **Raycast → Extensions → Overseerr → Preferences**.

## 🗝️ How to Get Your Overseerr API Key

1. Open your Overseerr web interface
2. Go to **Settings → API**
3. Copy the API Key and paste it into Raycast Preferences

## 🧪 API Permissions

Make sure the API key is created by a user with **administrator privileges** in Overseerr.  
Otherwise, approving requests or fetching settings may fail.

## 🗝️ How to Get Your TMDB API Key

To display localized titles (e.g., English, Spanish, Korean, Japanese) for movies and shows, this extension uses The Movie Database (TMDB) API.

Follow these steps to obtain your TMDB API key:
	1.	Visit https://www.themoviedb.org/ and sign up or log in.
	2.	Go to your account menu → Settings.
	3.	Navigate to the API tab: https://www.themoviedb.org/settings/api
	4.	Scroll down to API Key (v3 auth) and copy the key.
	5.	Paste this value into Raycast → Extensions → Overseerr → Preferences → TMDB API Key.

## 📂 Folder Structure

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

## 🧑‍💻 Author

Created by **cpm9662**
