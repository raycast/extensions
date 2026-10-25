# MiCompress

Compress **images, PDFs, video, audio, documents & archives** from Raycast, powered by
[micompress.com](https://micompress.com/?utm_source=raycast&utm_medium=extension&utm_campaign=extend).

Run **Compress File**, pick one or more files, choose a preset (Lossless, Recommended or Extreme), and
MiCompress writes an optimized `-min` copy next to each original. The original file is never modified.

## How it works

Each selected file is uploaded over HTTPS to micompress.com, compressed there, and the result is downloaded
back next to the original. No account is needed for small files. Uploaded files are deleted from the server automatically — see the
[privacy policy](https://micompress.com/privacy).

## API key (optional)

Without a key, per-type anonymous size limits apply. For bigger files, sign in (free) at
[micompress.com/account](https://micompress.com/account), copy your personal key (`mc_…`) and paste it into the
extension's **API Key** preference. With a key, files up to 100 MB are accepted. A free account includes 50
compressions/month through the API; Plus ($9.99/mo) includes 1,000/month and Pro ($19.99/mo) 5,000/month, shared
with website usage — see [plans](https://micompress.com/plans).
