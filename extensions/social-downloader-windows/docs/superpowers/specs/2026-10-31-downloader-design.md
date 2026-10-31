# Social Downloader — Windows

Approved in chat: local Raycast extension using React/TypeScript, yt-dlp for media inspection/download and FFmpeg for merging/conversion. Public Instagram, X and YouTube URLs; one media item per operation. Inspect available video resolutions and audio streams, select video+audio or audio only, MP4/MKV or MP3/M4A, configure destination and executable paths, show progress, cancel and open completed file.

Updated user requirement: automatic executable setup; the download folder is the only preference. On the first command launch, download pinned yt-dlp and FFmpeg/FFprobe releases, verify SHA-256 and stage installation in Raycast environment.supportPath. Reuse working tools without network on subsequent launches. No administrator permissions or PATH changes. Show setup progress, cancellation and retry. No server, authentication, playlists or batch queue. Default output is the user's Downloads folder. MP4/MKV preserve source codecs; incompatible MP4 streams produce an error suggesting MKV. MP3/M4A use selectable target bitrate when conversion is required, which does not improve source quality. UI also selects the source audio stream.

Alternatives: platform APIs require separate integrations/authentication; a hosted download service adds infrastructure and sends links to a third party. Selected approach: local yt-dlp plus FFmpeg for shared extraction and conversion support.

Processes use argument arrays without a shell. Configuration files are ignored, links are restricted to known public platform hosts, output names are Windows-safe and existing files are not overwritten. Cancellation kills the Windows process tree, including FFmpeg. Closing the command cancels active work. Partial files may remain after cancellation.
