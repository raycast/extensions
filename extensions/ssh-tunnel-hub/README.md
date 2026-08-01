# SSH Tunnel Hub (Raycast)

Kelola tunnel SSH local port forwarding (`ssh -N -L`) dari Raycast.

## Menjalankan

```bash
npm install
npm run dev
```

Raycast akan memuat extension ini dalam mode pengembangan. Setiap file yang
disimpan langsung dimuat ulang.

## Cara kerja

Raycast mematikan proses extension begitu jendelanya ditutup, jadi proses `ssh`
tidak bisa dipelihara di dalam extension. Sebagai gantinya:

- `ssh` dijalankan **detached** lalu di-`unref()`, sehingga lepas dari Raycast.
- PID-nya dicatat di `~/.config/ssh-tunnel-tui/state.json`.
- Status dibaca ulang dari PID tersebut, diverifikasi dengan `ps` agar PID yang
  sudah didaur ulang sistem tidak salah dibaca sebagai tunnel yang hidup.
- Keluaran `ssh` diarahkan ke `~/.config/ssh-tunnel-tui/logs/<id>.log`.

Daftar tunnel disimpan di `~/.config/ssh-tunnel-tui/tunnels.json` — lokasi yang
sama dengan versi TUI, jadi keduanya berbagi konfigurasi.

## Autentikasi

Tunnel dijalankan dengan `BatchMode=yes` karena tidak ada terminal untuk
mengetik password. Gunakan kunci SSH; muat passphrase-nya lebih dulu lewat
`ssh-add`.
