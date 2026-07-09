# Dosya ve Görsel Ekleri — Tasarım Dokümanı

**Tarih:** 2026-07-07
**Durum:** Onaylandı
**Bağlam:** Conversation Map sürümünün üzerine (master, `3d14887`) eklenen özellik. Önceki tasarımlar: [2026-07-05-conversation-map-design.md](2026-07-05-conversation-map-design.md), [2026-07-04-lmstudio-chat-design.md](2026-07-04-lmstudio-chat-design.md).

## Neden

Kullanıcı sohbete görsel ve dosya ekleyebilmek istiyor ("bu ikisi artık base şeyler"). LM Studio OpenAI-uyumlu API'si görselleri standart multimodal content-parts (`image_url` + base64 data URI) ile kabul eder; rastgele dosya yükleme API'si yoktur, bu yüzden dosya desteği "içeriği okunup prompt'a bağlam olarak eklenen metin dosyası" olarak tanımlanır. Native `/api/v1/models` yanıtı model başına `capabilities.vision` bayrağı verir (canlı doğrulandı, 2026-07-07; `google/gemma-4-e4b` → `vision: true`).

## Kapsam

- Görsel ekleri (png/jpg/jpeg/webp/gif) → vision modele `image_url` content part olarak.
- Metin/kod dosyası ekleri → içerik prompt'a blok olarak.
- Ekleme yüzeyleri: Finder seçimi + pano. Form sayfası yok.
- **Kapsam dışı:** PDF, sürükle-bırak, HEIC dönüştürme, ek düzenleme/yeniden sıralama, ek önizleme sayfası.

## Veri Modeli (`src/lib/types.ts`)

```ts
interface Attachment {
  type: "image" | "text";
  path: string;      // mutlak yol
  name: string;      // basename (gösterim için)
  content?: string;  // yalnızca type === "text": ekleme anında dondurulan içerik
}

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  attachments?: Attachment[]; // yalnızca user mesajlarında
}
```

- Görseller **yalnızca yol** olarak saklanır; base64 hiçbir zaman LocalStorage'a yazılmaz.
- Metin dosyasının içeriği **ekleme anında dondurulur** (`content`): dosya sonradan değişse/silinse de sohbet bağlamı tutarlı kalır. Sınır: dosya başına ~200 KB (aşarsa ekleme reddedilir, toast).

## Ekleme UX'i (`ChatView`)

- `pendingAttachments: Attachment[]` state'i; Enter'la gönderilen ilk mesaja iliştirilir ve temizlenir.
- **Aksiyonlar** (ActionPanel):
  - `Attach Finder Selection` (⌘⇧A): `getSelectedFinderItems()` — seçili dosyaları sınıflandırıp ekler.
  - `Attach from Clipboard` (⌥⌘V): `Clipboard.read()` — panodaki dosyayı/görseli ekler (ekran görüntüsü akışı); tip, normal sınıflandırmadan geçer.
  - `Clear Attachments` (pending doluyken görünür).
- **Gösterge:** arama çubuğu placeholder'ı dinamik ("📎 2 · Ask follow-up…") + `navigationTitle` sonuna "· 📎 N". Yeni satır/sayfa yok.
- **Sınıflandırma:** uzantı allowlist'i — image: `png jpg jpeg webp gif`; text: yaygın metin/kod uzantıları (`md txt json ts tsx js jsx py rb go rs swift kt java c cpp h css html xml yml yaml toml csv log sh`). İkisine de girmeyen dosya: içerik null-byte içermiyorsa ve UTF-8 çözülüyorsa text kabul edilir, aksi halde toast ile reddedilir.
- **Sınırlar:** mesaj başına en çok 5 ek; görsel ≤ 10 MB; metin ≤ 200 KB. Aşımlar ekleme anında toast ile reddedilir (gönderim anında sürpriz yok).

## Gönderim Akışı (`src/lib/payload.ts` — yeni saf modül)

`buildApiMessages(chat, systemPrompt?): ApiMessage[]` — API'ye giden mesaj dizisini kurar, UI'dan bağımsız ve birim test edilebilir:

- Ek içermeyen mesajlar aynen `{ role, content }`.
- Metin ekli user mesajı: içerik, soru + her ek için
  `\n\n--- attached file: <name> ---\n<content>` bloklarına genişletilir (dondurulmuş `content` kullanılır, dosya yeniden okunmaz).
- Görsel ekli user mesajı: OpenAI content-parts biçimine çevrilir:
  `[{ type: "text", text }, { type: "image_url", image_url: { url: "data:<mime>;base64,<...>" } }, ...]`. Mime, dosya uzantısından türetilir.
  Görseller **her istekte yoldan yeniden okunur** (base64 saklanmadığı için) — takip sorularında model görsel bağlamı korur. Dosya artık yoksa o görsel sessizce atlanır ve istek başına bir kez uyarı toast'ı gösterilir.
- `buildApiMessages` bir `includeImages: boolean` parametresi alır: seçili model vision desteklemiyorsa (örn. geçmişte görselli bir sohbete vision'sız modelle devam ediliyorsa) görsel parts atlanır, mesaj yalnızca metinle gider — API hatası yerine sessiz degrade + bilgi toast'ı.
- `chatStream` imzası `ApiMessage[]` kabul edecek şekilde genelleştirilir (content: string | ContentPart[]); SSE/stream mantığı değişmez.

## Vision Koruması

- `useLoadedModels` kaynağını `/v1/models`'ten native `/api/v1/models`'e taşır: yüklü (`loaded_instances` boş olmayan, `type === "llm"`) modelleri `{ id: key, vision: capabilities.vision }` olarak döner. 10 sn tazelik kuralı korunur.
- Görsel ekleme aksiyonu: seçili model `vision: false` ise engellenir (Failure toast: "Model görsel desteklemiyor").
- Görsel ekli taslak varken vision'sız modele geçilirse Enter engellenir (aynı toast); metin ekleri her modelde serbest.

## Transkript (`src/lib/transcript.ts`)

- `turnMarkdown`: soru bloğunun altına görsel ekler `![<name>](file://<encodeURI(path)>)` olarak, metin ekler `📎 <name>` satırı olarak eklenir. (Raycast Detail markdown'ının lokal `file://` görselleri render ettiği implementasyonda canlı doğrulanır; etmezse görseller de `📎 <name>` satırına düşer.)
- Sol kolon: ekli turlara `Icon.Paperclip` aksesuarı eklenir (model tag'i + tarihin yanına).

## Hata Yönetimi

| Durum | Davranış |
|---|---|
| Vision'sız modele görsel ekleme / gönderme | Failure toast, işlem engellenir; taslak korunur |
| Ek sınır aşımı (adet/boyut/tip) | Ekleme anında toast ile red; geçerli olanlar eklenir |
| Görsel dosyası gönderim anında yok | Görsel atlanır, uyarı toast'ı; mesaj yine gönderilir |
| Finder seçimi boş / pano dosya içermiyor | Bilgi toast'ı ("Finder'da dosya seçin" / "Panoda dosya yok") |
| API hatası | Mevcut davranış (Failure toast, kısmi cevap korunur) |

## Test / Doğrulama

- Birim (vitest): sınıflandırma (uzantı + null-byte fallback, sınırlar), `buildApiMessages` (eksiz, metin ekli, görsel ekli — küçük fixture PNG ile data-URI doğrulaması, kayıp dosya atlama), attachments'lı `turnMarkdown`, `useLoadedModels` parser'ının vision alanı.
- Mevcut 34 test yeşil kalır; `ray lint` + `ray build` temiz.
- Canlı e2e (gemma-4-e4b, vision ✓): görsel ekle → soru sor → görsel hakkında doğru cevap; metin dosyası ekle → özet iste; vision'sız senaryo (bayrak koruması); dosya silinmiş görselle follow-up.
