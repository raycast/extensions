# LM Studio Chat — Raycast Extension Tasarım Dokümanı

**Tarih:** 2026-07-04
**Durum:** Onaylandı

## Amaç

LM Studio'nun lokal API'sine bağlanan, yüklü lokal modellerle çok turlu sohbet imkânı veren bir Raycast extension'ı. Sohbetler kalıcı olarak saklanır, modeller extension içinden yönetilebilir.

## Teknoloji

- **Platform:** Raycast Extension API (`@raycast/api`, `@raycast/utils`), TypeScript + React
- **Node ortamı:** Raycast'in yerleşik Node runtime'ı; ekstra HTTP bağımlılığı yok, düz `fetch` kullanılır
- **Geliştirme:** `npm run dev` (hot reload), `ray lint`, `ray build`

## API Stratejisi

| İş | Endpoint | Not |
|---|---|---|
| Sohbet | `POST {baseUrl}/v1/chat/completions` | OpenAI-uyumlu, `stream: true` ile SSE streaming |
| Model listesi (dropdown) | `GET {baseUrl}/v1/models` | Yüklü modelleri listeler |
| Model durumu + yönetim | `GET {baseUrl}/api/v1/models`, `POST {baseUrl}/api/v1/models/load`, `POST {baseUrl}/api/v1/models/unload` | LM Studio native REST API; indirilmiş/yüklü ayrımını gösterir |

- Varsayılan `baseUrl`: `http://localhost:1234`, Preferences'tan değiştirilebilir.
- Opsiyonel API token: doluysa `Authorization: Bearer <token>` header'ı eklenir.
- SSE parsing: `data:` satırları ayrıştırılır, `[DONE]` ile akış sonlanır; `delta.content` parçaları birleştirilir.

## Komutlar

### 1. `chat` — Chat (view komutu)

Quick AI benzeri tam genişlik sohbet (2026-07-05 ikinci revizyon — kullanıcı geri bildirimiyle):

- Komut **her zaman yeni sohbet** başlatır. Opsiyonel `prompt` argümanı: soru Raycast ana aramasında komutla birlikte yazılabilir; verilirse model listesi gelir gelmez otomatik gönderilir.
- **Üst bar mesaj girişidir** (2026-07-05 üçüncü revizyon): kullanıcı doğrudan üstteki bara yazar, Enter follow-up olarak gönderir — ayrı form sayfası yok (Quick AI hissi). Streaming sürerken Enter reddedilir (toast) ve taslak barda korunur.
- Konuşma başlamadan önce görünüm boş durumdadır ("Ask anything"); ilk mesajla birlikte tek satırlık bir "conversation" öğesi belirir, döküm sağ detay panelinde akar (~2/3 genişlik — Raycast API'sinde yazılabilir üst bar yalnızca List görünümünde olduğundan tam genişlik mümkün değil; bilinçli ödünleşim).
- En yeni soru-cevap çifti en üstte (detay paneli otomatik scroll yapmadığı için streaming hep görünür); çift içinde soru üstte.
- Model seçimi üst bardaki dropdown'dan; liste sunucudan taze çekilir.

**Aksiyonlar:** Gönder/Ask Follow-Up (Enter), Son cevabı kopyala (⌘C), Son cevabı aktif uygulamaya yapıştır (⌘⇧V), Yeni Sohbet (⌘N).

### 1b. `history` — Chat History (view komutu)

- Geçmiş sohbetleri listeler (başlık + model + tarih), Raycast'in yerleşik aramasıyla filtrelenir.
- **Continue Chat** (Enter): seçilen sohbet tam genişlik `ChatView`'da açılır ve kaldığı yerden devam eder.
- Diğer aksiyonlar: Son cevabı kopyala (⌘C), Sohbeti Sil (ctrl+X).

### Tazelik kuralı

Model listeleri (`/v1/models`, `/api/v1/models`) **cache'siz** çekilir ve görünümler açıkken 10 saniyede bir yeniden fetch edilir — sunucuda olmayan model asla gösterilmez.

### 2. `models` — Manage Models (view komutu)

- İndirilmiş modelleri listeler (`GET /api/v1/models`), yüklü olanları etiketle işaretler.
- Aksiyonlar: Modeli Yükle (load), Modeli Boşalt (unload), model kimliğini kopyala.
- İşlem sırasında Toast ile ilerleme/sonuç bildirimi.

## Preferences (package.json manifest)

| Anahtar | Tip | Varsayılan |
|---|---|---|
| `baseUrl` | textfield | `http://localhost:1234` |
| `apiToken` | password (opsiyonel) | boş |
| `systemPrompt` | textfield (opsiyonel) | boş |
| `temperature` | textfield | `0.7` |
| `defaultModel` | textfield (opsiyonel) | boş → ilk yüklü model |

## Veri Modeli ve Kalıcılık

Raycast `LocalStorage` kullanılır.

```ts
interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface Chat {
  id: string;          // uuid
  title: string;       // ilk kullanıcı mesajından türetilir (kırpılmış)
  model: string;       // son kullanılan model id
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}
```

- Sohbet listesi `chats` anahtarında JSON olarak saklanır; aktif sohbet id'si ayrı anahtarda.
- Asistan cevabı tamamlandığında (veya akış kesildiğinde yarım haliyle) kaydedilir.

## Dosya Yapısı

```
lmstudio-chat/
├── package.json          # Manifest: 2 komut + preferences
├── tsconfig.json
├── assets/icon.png
└── src/
    ├── chat.tsx          # Chat komutu (ana UI)
    ├── models.tsx        # Manage Models komutu
    ├── lib/
    │   ├── lmstudio.ts   # API istemcisi: listModels, chatStream, loadModel, unloadModel
    │   ├── storage.ts    # Sohbet CRUD (LocalStorage)
    │   └── types.ts      # Chat, Message, Model tipleri
    └── hooks/
        ├── useChat.ts    # Mesaj gönderme + streaming state
        └── useModels.ts  # Model listesi + yüklü model takibi
```

**Birim sorumlulukları:**
- `lib/lmstudio.ts`: Tüm HTTP/SSE detayları burada izole; UI katmanı sadece async fonksiyon/async iterator görür.
- `lib/storage.ts`: LocalStorage şeması yalnızca burada bilinir; CRUD arayüzü sunar.
- `hooks/useChat.ts`: Sohbet state makinesi (idle → streaming → done/error); `chat.tsx` yalnızca render eder.

## Hata Yönetimi

| Durum | Davranış |
|---|---|
| Sunucuya ulaşılamıyor | `List.EmptyView`: "LM Studio çalışmıyor — uygulamayı açın veya `lms server start` çalıştırın" |
| Yüklü model yok | Uyarı + Manage Models komutuna yönlendiren aksiyon |
| Akış hatası / kesinti | Failure Toast; o ana kadar gelen kısmi cevap korunur ve kaydedilir |
| HTTP hata cevabı | Toast'ta durum kodu + mesaj gösterilir |

## Test / Doğrulama

- `ray lint` ve `ray build` temiz geçmeli.
- Çalışan LM Studio'ya karşı manuel uçtan uca senaryolar: mesaj gönderme + streaming, model değiştirme, çoklu sohbet oluşturma/dönme/silme, load/unload, sunucu kapalıyken hata ekranı.

## Kapsam Dışı (v2 adayları)

- Raycast Store'a yayınlama süreci
- Dosya/görsel ekleme (multimodal)
- Token/istatistik gösterimi, konuşma dışa aktarma
