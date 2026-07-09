# Chat "Conversation Map" Layout + Logo — Tasarım Dokümanı

**Tarih:** 2026-07-05
**Durum:** Onaylandı
**Bağlam:** Mevcut LM Studio Chat eklentisinin Chat komutunun arayüz revizyonu. Önceki tasarım: [2026-07-04-lmstudio-chat-design.md](2026-07-04-lmstudio-chat-design.md).

## Neden

Kullanıcı Quick AI benzeri bir deneyim istiyor: üstte her zaman yazılabilir bir bar (follow-up için ekstra tık yok) ve sağda temiz, biçimli cevap. Raycast eklenti API'si "tam genişlik markdown + inline yazılabilir bar"ı tek ekranda vermiyor (doğrulandı: `Detail`'de metin girişi yok; `List`+detail'de sol kolon kapatılamıyor; `Form.Description` markdown render etmiyor; AI API cloud/Pro). Bu yüzden `List` + `isShowingDetail` deseni seçildi ve sol kolon "boşa giden alan" olmaktan çıkarılıp bir **Konuşma Haritası**na dönüştürülüyor.

## Kapsam

Yalnızca `src/chat.tsx` / `ChatView` ve yardımcılarının yeniden düzenlenmesi, yeni bir uygulama ikonu, ve buna bağlı test/doküman güncellemeleri. Storage, API istemcisi, `history` ve `models` komutları davranışsal olarak değişmez (history yalnızca ChatView'a köprü kurar).

## Chat Komutu — Konuşma Haritası Düzeni

`List` + `isShowingDetail` deseni:

- **Üst bar (arama çubuğu) = mesaj girişi.** Her zaman yazılabilir; `filtering={false}`, `onSearchTextChange` ile kontrollü. Placeholder: konuşma yokken "Ask anything…", varken "Ask follow-up…". Enter mesajı gönderir. Streaming sürerken Enter reddedilir (Failure toast) ve taslak barda korunur.
- **Model dropdown'ı** `searchBarAccessory`'de; sunucudan taze çekilen listeyle dolar (10 sn'de bir yenilenir; sunucuda olmayan model listelenmez).

### Sol kolon — Konuşma Haritası

Her **kullanıcı turu** (bir soru + onun cevabı) bir `List.Item`:

- **Sıra:** en yeni üstte.
- **`icon`:** akmakta olan tur `{ source: Icon.Dot, tintColor: Color.Green }` (canlı nokta ●); diğerleri `Icon.Bubble` (veya `Icon.Message`).
- **`title`:** kullanıcı sorusu, tek satıra sığacak şekilde whitespace toplanıp ~40 karaktere kırpılmış.
- **`accessories`:** `[{ tag: { value: <kısa model adı>, color: <modelden türetilmiş renk> } }, { date: new Date(turUpdatedAt) }]`. Kısa model adı = model id'nin son `/` sonrası parçası. Renk, model id'nin deterministik hash'inden sabit bir palet üzerinden seçilir (aynı model hep aynı renk).
- **`id`:** turun indeksinden türetilir (ör. `turn-<userMessageIndex>`); yeni tur eklendiğinde `selectedItemId` bu id'ye ayarlanır ki streaming turu otomatik seçili gelsin ve görünür kalsın.

### Sağ panel — Quick AI biçimi

Seçili turun `List.Item.Detail` markdown'ı, gönderilen ekran görüntülerindeki düzene benzer:

```
**🧑 You**

<soru metni>

---

**🤖 <model adı>**

<cevap metni veya akış sırasında biriken içerik ya da "…">
```

Tek tur gösterildiği için otomatik-scroll sorunu yok; içerik kısa ve seçili tur hep tepede. Cevap SSE geldikçe canlı güncellenir.

### Aksiyonlar (ActionPanel)

Seçili turda: Send / Ask Follow-Up (Enter, `handleSend`), Copy Answer (⌘C — o turun cevabı), Paste Answer to Active App (⌘⇧V — o turun cevabı), New Chat (⌘N), Delete Chat (⌃X). Konuşma yokken (boş görünüm): Send Message + New Chat.

### Durumlar

| Durum | Davranış |
|---|---|
| Sunucu kapalı (`isConnectionError`) | `List.EmptyView`: "LM Studio is not running" + `lms server start` yönlendirmesi + Retry |
| Diğer HTTP hatası | `List.EmptyView`: "Failed to reach LM Studio" + `error.message` + Retry |
| Model yok | Boş görünüm: "No model available" + LM Studio'da model indir |
| Konuşma yok | Boş görünüm: "Ask anything" + yazıp Enter'la |
| Stream hatası/iptal | Failure toast; o ana kadarki kısmi cevap korunur ve kaydedilir |

## Yardımcı Fonksiyonlar (ChatView içinde, saf ve test edilebilir)

- `splitIntoTurns(chat): Turn[]` — mesaj dizisini `{ question: Message; answer?: Message; userIndex: number }` turlarına böler (bir user mesajı + sonrasındaki assistant mesajı). En yeni üstte döndürmek için çağıran taraf `reverse()` uygular.
- `turnMarkdown(turn, model): string` — yukarıdaki Quick AI biçimli markdown'ı üretir.
- `shortModelName(modelId): string` — son `/` sonrası parça.
- `modelColor(modelId): Color` — deterministik hash → sabit palet (ör. `[Color.Blue, Color.Green, Color.Magenta, Color.Orange, Color.Purple, Color.Yellow, Color.Red]` içinden).

Bu saf fonksiyonlar `src/lib/transcript.ts` altına taşınır ve vitest ile birim test edilir (UI'dan bağımsız). `buildTranscript`/`lastAnswer` yerini `splitIntoTurns` + `turnMarkdown`'a bırakır.

## Logo

**Konsept:** yuvarlak köşeli koyu kare zeminde, mor→pembe degradeli bir **konuşma balonu**; balonun içinde minimal bir **çip/işlemci düğümü** (kare + dört kenardan çıkan kısa bacaklar veya küçük bir nokta-devre). "Lokal hesaplama + sohbet" fikrini birleştirir; LM Studio paletine (mor/pembe) selam verir.

- **Çıktı:** `assets/icon.png`, 512×512, arkaplan koyu (light/dark Raycast temasında da okunur), dolgulu (şeffaf değil) yuvarlak-kare.
- **Üretim:** derleme öncesi bir kez üretilir; tercihen SVG tasarlanıp mevcut bir araçla (PIL / rsvg / cairosvg / sips — hangisi varsa) 512×512 PNG'ye rasterlenir. Araç yoksa PIL ile doğrudan çizim. Nihai kriter: 512×512 PNG, `ray build` ikon doğrulamasından geçer, 48–64px'te net okunur.

## Test / Doğrulama

- `src/lib/transcript.ts` için birim testler: tek tur, çok tur, cevapsız (yalnız soru) tur, boş cevap ("…"), `shortModelName`, `modelColor` determinizmi.
- Mevcut 25 test yeşil kalır; `ray lint` ve `ray build` temiz.
- Canlı LM Studio'ya karşı manuel: mesaj gönder → sol kolonda tur belirir, sağda Quick AI biçimli cevap akar; follow-up ekle → yeni tur en üstte, otomatik seçili; model değiştir → yeni turun etiketi yeni model rengiyle; sunucu kapalı ekranı.

## Kapsam Dışı

- Preferences'tan düzen seçme (tam genişlik modu) — bu iterasyonda yok.
- Sol kolonda niyet-emojisi / numaralı içindekiler alternatifleri (reddedildi).
- Turların yeniden sıralanması, sabitleme/yıldızlama.
