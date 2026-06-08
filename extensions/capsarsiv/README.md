# Capsarsiv Raycast Extension

Raycast icinden Turkce Caps Arsivi'nde caps aramak icin hafif extension.

## Kullanma

1. `npm install`
2. `npm run dev`
3. Raycast'te `Caps Ara` komutunu ac.

Varsayilan API adresi `https://capsarsiv.com`. Lokal gelistirme icin Raycast extension ayarlarindan `Capsarsiv URL` degerini `http://127.0.0.1:4173` gibi degistirebilirsin.

Store'a gondermeden once `package.json` icindeki `author` alanini kendi Raycast Store handle'in ile degistir. Su an `cobanov` placeholder olarak duruyor ve Raycast API bu handle'i dogrulamiyor.

## Aksiyonlar

- `Open in Browser`: Caps sayfasini acar.
- `Copy Page URL`: Caps sayfasi URL'ini kopyalar.
- `Copy Image URL`: Varsa gorsel URL'ini kopyalar.
- `Copy Markdown Link`: Baslik ve URL'i Markdown link olarak kopyalar.
