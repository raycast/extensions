# Self-hosting the Wojak library on your VPS

This replaces the old Supabase Storage + Postgres setup with plain static files served
by Nginx. Because the library is read-only, no database or object-storage layer is
needed — just a folder of images, pre-generated thumbnails, and a JSON manifest.

```
your-vps:/var/www/wojaks/
├── images/<category-slug>/<file>   # full-size wojaks
├── thumbs/<category-slug>/<file>   # 320px thumbnails (grid view)
└── wojaks.json                     # metadata manifest (id, name, category, URLs)
```

The Raycast extension only needs one preference: the public base URL of this folder.

## One-time server setup

1. Copy `nginx-wojaks.conf` to the server and edit `server_name` to your domain:

   ```bash
   scp deploy/nginx-wojaks.conf user@your-vps:/etc/nginx/sites-available/wojaks.conf
   ssh user@your-vps
   sudo sed -i 's/wojaks.example.com/your-domain.com/' /etc/nginx/sites-available/wojaks.conf
   sudo ln -s /etc/nginx/sites-available/wojaks.conf /etc/nginx/sites-enabled/
   sudo mkdir -p /var/www/wojaks
   sudo chown -R "$USER" /var/www/wojaks
   sudo nginx -t && sudo systemctl reload nginx
   ```

2. Add HTTPS (recommended):

   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

## Build and deploy (run from the `wojak-picker/` directory)

1. Install the build-only dependency once:

   ```bash
   npm install sharp
   ```

2. Generate thumbnails + manifest. `WOJAK_BASE_URL` must match what the extension uses:

   ```bash
   WOJAK_BASE_URL=https://your-domain.com npm run build:deploy
   ```

   This writes everything to `deploy/dist/` (full images, 320px thumbs, `wojaks.json`).

3. Upload to the server:

   ```bash
   VPS_HOST=user@your-vps npm run deploy
   ```

   Optional env vars: `VPS_PATH` (default `/var/www/wojaks`), `SSH_PORT` (default `22`),
   `DELETE=1` to prune remote files that no longer exist locally.

4. Verify:

   ```bash
   curl -sI https://your-domain.com/wojaks.json
   curl -s  https://your-domain.com/wojaks.json | head -c 200
   ```

5. In Raycast, set **Library Base URL** to `https://your-domain.com`.

## Updating the library later

After re-running the scraper (`npm run scrape`) or adding images to `assets/wojaks/`,
just repeat the build + deploy steps. Filenames are content keys, so re-uploads are
idempotent and browsers cache aggressively (`Cache-Control: immutable`).

## Notes / tradeoffs

- **Thumbnails are pre-generated**, replacing Supabase's on-the-fly `render/image`
  endpoint. PNG thumbnails use palette quantization (flat-color wojak art compresses
  extremely well), so the full thumbnail set is ~46 MB instead of ~100 MB at full color.
  Tunable via `THUMB_SIZE` / `THUMB_QUALITY` / `THUMB_COLORS` env vars (e.g.
  `THUMB_SIZE=256` drops it to ~33 MB).
- **No API keys.** The files are public, exactly like the old public bucket. The old
  `supabaseAnonKey` preference is gone.
- **Disk:** full images are ~1.6 GB; thumbnails add roughly ~100 MB.
- If you ever want an S3-style API instead of static files, MinIO can serve the same
  `images/`/`thumbs/` layout — but for a read-only library, static Nginx is simpler.
