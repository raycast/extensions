# Otomatik Görsel Küçültme — Tasarım Dokümanı

**Tarih:** 2026-07-09
**Durum:** Onaylandı
**Bağlam:** [2026-07-07-attachments-design.md](2026-07-07-attachments-design.md) üzerine küçük revizyon. Kullanıcı isteği: büyük görseller reddedilmesin, otomatik küçültülüp gönderilsin. Metin dosyaları için kırpma bilinçli olarak KAPSAM DIŞI bırakıldı (200 KB reddi kalır — sessiz içerik kaybı, açık redden daha kötü).

## Davranış

- Görsel ekinde boyut reddi kalkar. Ekleme anında görsel **10 MB'tan büyükse VEYA uzun kenarı 2048 px'i aşıyorsa**, macOS yerleşik `sips` aracıyla küçültülmüş bir **JPEG kopya** üretilir (uzun kenar ≤ 2048, kalite ~%85) ve `Attachment.path` bu kopyayı gösterir; `name` orijinal dosya adını korur. Orijinal dosyaya dokunulmaz.
- Küçük görseller (≤ 10 MB ve ≤ 2048 px) eskisi gibi orijinal yoluyla eklenir — kopya üretilmez.
- Kopyalar extension destek klasörü altında yaşar: `environment.supportPath/attachments/<hash>.jpg`. Hash = orijinal yol + mtime + boyut → aynı dosya tekrar eklendiğinde önbellekten kullanılır, yeniden encode edilmez.
- `sips` başarısız olursa (bozuk dosya vb.) ekleme `"<name>: could not downscale image"` gerekçesiyle reddedilir. Boyut/çözünürlük okunamıyorsa ama dosya ≤ 10 MB ise orijinal kabul edilir.
- Bilinen ödünleşimler: GIF animasyonu tek kareye düşer, saydamlık JPEG'de kaybolur — vision modeller için önemsiz, kabul edildi.

## API (`src/lib/attachments.ts`)

- `MAX_IMAGE_DIMENSION = 2048` (yeni sabit; `MAX_IMAGE_BYTES` artık red değil, küçültme eşiği).
- `classifyPath(path, options?: { imageCacheDir?: string })` — görsel dalında eşik aşımında `options.imageCacheDir` verilmişse küçültür; verilmemişse (savunmacı geri düşüş) eski red davranışı korunur.
- `downscaleImage(path, cacheDir): Promise<string>` — sips ile kopyayı üretir/önbellekten döner (dışa açık, ayrı test edilebilir).
- Çağıran taraf: `ChatView.addAttachments`, `imageCacheDir: join(environment.supportPath, "attachments")` geçer.

## Test / Doğrulama

- Birim (vitest, macOS): küçük görsel → orijinal yol, kopya yok; 3000×3000 üretilmiş fixture (sips ile oluşturulur) → dönen yol cacheDir içinde `.jpg`, uzun kenar ≤ 2048 (sips -g ile doğrulanır); aynı dosya ikinci kez → aynı kopya (önbellek); cacheDir verilmeden büyük görsel → red (eski davranış).
- README/CHANGELOG: "images ≤ 10 MB" ifadesi "oversized images are automatically downscaled" olarak güncellenir.
- Mevcut 51 test yeşil kalır; lint + build temiz.
