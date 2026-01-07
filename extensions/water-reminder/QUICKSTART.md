# Quick Start Guide - Water Reminder Extension

## 🚀 Cài đặt & Chạy

```bash
cd water-reminder
npm install
npm run dev
```

Extension sẽ mở trong Raycast development mode!

## 🎯 Cách sử dụng

### 1. Cấu hình Extension

Mở **Raycast → Settings → Extensions → Water Reminder** để cài đặt:

- **Daily Water Goal**: Mục tiêu nước mỗi ngày (mặc định: 2000ml)
- **Default Amount**: Lượng nước mặc định (mặc định: 250ml)
- **Reminder Interval**: Khoảng thời gian nhắc nhở (mặc định: 60 phút)
- **Apple Shortcut Name**: Tên shortcut để tích hợp (tùy chọn)
- **Enable Notifications**: Bật/tắt thông báo nhắc nhở

### 2. Log Water (Ghi nhận uống nước)

**Cách 1: Dùng Command**
1. Mở Raycast (`Cmd + Space`)
2. Gõ "Log Water"
3. Nhập lượng nước (ml)
4. Thêm ghi chú (tùy chọn)
5. Enter để lưu

**Cách 2: Dùng Hotkey (Khuyến nghị)**
1. Vào Raycast Settings → Extensions → Water Reminder
2. Tạo hotkey cho command "Log Water" (ví dụ: `Cmd + Shift + W`)
3. Bất kỳ lúc nào, nhấn hotkey để log nhanh!

### 3. Xem Lịch Sử (View History)

1. Mở Raycast
2. Gõ "Water History"
3. Xem:
   - Tổng lượng nước đã uống hôm nay
   - Phần trăm hoàn thành mục tiêu
   - Chi tiết từng lần uống (thời gian, lượng, ghi chú)
   - Xóa log nếu cần (Cmd + Delete)

### 4. Background Reminder

**Cách 1: Chạy thủ công**
1. Mở Raycast
2. Gõ "Water Reminder (Background)"
3. Sẽ hiển thị HUD notification với trạng thái hiện tại

**Cách 2: Tự động nhắc nhở**

Sử dụng **Raycast Scheduled Commands** (tính năng Pro):
1. Vào Settings → Extensions → Water Reminder
2. Tìm command "Water Reminder (Background)"
3. Thêm schedule (ví dụ: mỗi 60 phút)

Hoặc dùng **macOS Automator**:
```applescript
# Tạo Calendar Event hoặc dùng crontab
*/60 * * * * open "raycast://extensions/water-reminder/reminder"
```

## 🔗 Tích hợp Apple Shortcuts

### Bước 1: Tạo Shortcut

1. Mở **Shortcuts** app
2. Tạo shortcut mới
3. Thêm các action:
   ```
   - Receive [Dictionary] input from Sharing
   - Get value for "amount" in [Shortcut Input]
   - Get value for "totalToday" in [Shortcut Input]
   - Get value for "timestamp" in [Shortcut Input]
   ```

### Bước 2: Thêm Logic

**Ví dụ 1: Sync vào Apple Health**
```
- Log Health Sample
  Type: Water
  Amount: [amount] ml
  Date: [timestamp]
```

**Ví dụ 2: Gửi thông báo khi đạt mục tiêu**
```
- If [totalToday] is greater than [goal]
  - Show Notification
    Title: "🎉 Đã đạt mục tiêu!"
    Body: "Bạn đã uống đủ [totalToday]ml nước hôm nay!"
```

**Ví dụ 3: Log vào Google Sheets**
```
- Format Date [timestamp] as "HH:mm dd/MM/yyyy"
- Add row to Google Sheets
  Spreadsheet: "Water Log"
  Row: [formatted date] | [amount]ml | [note]
```

### Bước 3: Kết nối với Extension

1. Copy tên shortcut (ví dụ: "Log Water to Health")
2. Paste vào Water Reminder preferences → **Apple Shortcut Name**
3. Mỗi lần log water, shortcut sẽ tự động chạy!

### Dữ liệu gửi đến Shortcut

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "amount": 250,
  "note": "Sau khi tập gym",
  "totalToday": 1500,
  "goal": 2000
}
```

## 💡 Tips & Tricks

### 1. Hotkey cho Log Nhanh
Tạo hotkey `Cmd + Shift + W` cho "Log Water" để log chỉ trong 2 giây:
- Nhấn hotkey → Enter (sử dụng default amount)

### 2. Aliases
Tạo alias trong Raycast:
- "uống nước" → Log Water
- "nước" → Log Water
- "water" → Log Water

### 3. Script Tự Động
Dùng cron để tự động nhắc nhở:
```bash
# Thêm vào crontab
0 9,11,13,15,17,19 * * * open "raycast://extensions/water-reminder/reminder"
```

### 4. Apple Watch Integration
Tạo Shortcut với widget trên Apple Watch:
- Shortcut nhận input từ Apple Watch
- Gọi Raycast URL scheme: `raycast://extensions/water-reminder/log-water`

### 5. Siri Integration
Tạo Shortcut và thêm vào Siri:
- "Hey Siri, log water 250ml"
- Shortcut sẽ trigger Raycast extension

## 🎨 Customization

### Thay đổi Icon
Thêm file `icon.png` (512x512) vào thư mục `assets/`:
```bash
# Tải icon từ SF Symbols hoặc tạo custom
cp ~/Downloads/water-icon.png water-reminder/assets/icon.png
npm run build
```

### Thêm Notification Sound
Chỉnh sửa [reminder.tsx](src/reminder.tsx#L30):
```typescript
import { Sound } from "@raycast/api";

await showHUD({
  message: message,
  sound: Sound.Glass  // Thêm sound effect
});
```

## 📊 Dữ liệu Lưu Trữ

Logs được lưu tại:
```
~/Library/Application Support/com.raycast.macos/extensions/water-reminder/water-logs/
```

Format: `YYYY-MM-DD.json`
```json
[
  {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "amount": 250,
    "note": "Sau bữa sáng"
  },
  {
    "timestamp": "2024-01-15T14:00:00.000Z",
    "amount": 300
  }
]
```

## ❓ Troubleshooting

**Extension không hiện trong Raycast:**
```bash
npm run build
# Reimport extension in Raycast Settings
```

**Shortcut không trigger:**
- Kiểm tra tên shortcut chính xác (case-sensitive)
- Test shortcut độc lập trong Shortcuts app
- Check logs: `console.log` trong `shortcuts.ts`

**Reminder không hoạt động:**
- Bật "Enable Notifications" trong preferences
- Kiểm tra Raycast có quyền gửi notifications không

## 🚀 Nâng cấp Pro

### Thêm Statistics View
Tạo command mới `water-stats.tsx`:
- Weekly trends
- Heatmap calendar
- Charts & graphs

### Integration với Health Apps
- Fitbit API
- MyFitnessPal
- Samsung Health

### Gamification
- Streaks (duy trì mục tiêu liên tục)
- Achievements badges
- Leaderboard với friends

---

**Chúc bạn stay hydrated! 💧**
