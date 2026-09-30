# Fathom for Raycast

<div align="center">
  <a href="https://github.com/chrismessina">
    <img src="https://img.shields.io/github/followers/chrismessina?label=Follow%20chrismessina&style=social" alt="Follow @chrismessina">
  </a>
  <a href="https://github.com/chrismessina/raycast-fathom/stargazers">
    <img src="https://img.shields.io/github/stars/chrismessina/raycast-fathom?style=social" alt="Stars">
  </a>
  <a href="https://www.raycast.com/chrismessina/fathom">
    <img src="https://img.shields.io/badge/Raycast-Store-red.svg" alt="Fathom on Raycast store.">
  </a>
</div>

Search, manage, and review your [Fathom](https://fathom.ai/) meetings and recordings. Use the `@fathom` AI extension to ask questions about your meetings, or trigger other AI tasks, for example:
> summarize my last meeting in @fathom and create tasks in @todoist

## Getting started

To use this extension, you'll need a Fathom API key:

1. Visit [Fathom Settings](https://fathom.video/customize)
2. Navigate to the **API Access** section
3. Click **Add** to generate a new API key
4. Copy the generated API key
5. Open Raycast preferences for the Fathom extension and paste your API key

## Fathom Commands

- **Search Meetings** - Browse and search your Fathom meetings, view summaries and transcripts, copy meeting links, or export content as Markdown
- **Search Team Members** - View and search your Fathom team members with their contact information and team affiliations

## AI Tools

- **List Meetings** - Search and list Fathom meetings with full-text search across titles, summaries, and transcripts, plus filters for participants, date ranges, topics, and meeting types
- **Get Meeting Details** - Retrieve detailed information about a specific Fathom meeting including summary, transcript, action items, participants, and duration
- **List Team Members** - Get team member information including names, emails, and team affiliations

## Features

- **Smart Caching** - Intelligent caching system reduces API calls and improves performance
- **Full-text Search** - Search across meeting titles, summaries, and transcripts
- **Advanced Filtering** - Filter meetings by participants, date ranges, topics, and meeting types
- **Action Items** - View and manage action items from your meetings
- **Export Options** - Export meeting summaries and transcripts as Markdown
- **Download Recordings** - Save the recording itself to disk (⌘⇧D), or copy a direct link (⌘⇧L)
- **Cross-platform Support** - Works on both macOS and Windows

### Downloading recordings

Recordings are large — typically 250–650 MB for a 30–60 minute meeting — and Fathom needs about half a minute to prepare one before the transfer can start.

Because of that, downloads run in a **background process that keeps going after you dismiss Raycast**. Start a download, press Escape, and it continues; reopen Search Meetings to see the progress. If a transfer is interrupted it resumes from where it stopped rather than starting over, and cancelling leaves no half-written file behind.

Files land in the **Export Directory** set in extension preferences (`~/Downloads` by default), named after the meeting and its date.

Two things worth knowing:

- **Download links expire within 24 hours.** "Copy Download Link" gives you a signed URL that stops working after that; request it again if you need a fresh one.
- **Permissions apply.** Only the recording's owner, teammates who can view it, and people it was shared with at standard or admin level can download it. Limited-access shares will report that access was denied.

## Privacy

This extension communicates directly with the Fathom API using your API key. All data is fetched securely from Fathom's servers and cached locally for performance. No data is collected or shared with third parties.

## Support

This extension is an independent project and is not affiliated with, endorsed by, or in any way officially connected to Fathom Video, Inc. All trademarks and copyrights related to Fathom are the property of their respective owners.
