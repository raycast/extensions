# Move to Another Mac

Copy the packaged archive to another Mac, then run:

```bash
tar -xzf raycast-imgbed-uploader-20260517.tar.gz
cd raycast-imgbed-uploader
./install-local.sh
```

Requirements on the target Mac:

```text
- Raycast installed
- Raycast CLI available as `ray`
- Node.js/npm installed
```

Configure these values in Raycast Preferences after installing the extension:

```text
ImgBed Base URL: Your ImgBed instance URL
Auth Code: Your ImgBed upload auth code
Upload Channel: cfr2
Auto Retry: false
```
