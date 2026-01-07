# AI Translator (Trình Dịch AI)

 Một tiện ích mở rộng của Raycast dành cho việc dịch văn bản thông minh với khả năng tự động phát hiện ngôn ngữ.

---

## Dành cho Người dùng

![AI Translator Screenshot](https://cdn-std.droplr.net/files/acc_692205/91Hous)

### Cài đặt

1. **Tải về dự án**: Tải xuống kho lưu trữ dưới dạng tệp ZIP từ GitHub.
2. **Giải nén**: Giải nén tệp ZIP đã tải về vào một thư mục trên máy tính của bạn.
3. **Cài đặt và Xây dựng**:
   - Mở Terminal và điều hướng đến thư mục bạn vừa giải nén.
   - Chạy các lệnh sau để cài đặt các gói phụ thuộc và xây dựng tiện ích mở rộng:
     ```bash
     npm install
     npm run build
     ```
   - *Lưu ý: Bạn cần phải cài đặt Node.js và npm trên máy của mình để thực hiện bước này.*
4. **Mở Raycast và Import Extension**:
   - Mở Raycast và đi tới **Settings → Extensions**.
   - Nhấp vào nút **+** và chọn **Import Extension**.
   - Điều hướng đến thư mục bạn đã giải nén và chọn nó.

### Cấu hình

 Sau khi cài đặt, bạn cần cấu hình tiện ích mở rộng:

 Sau khi cài đặt, bạn cần cấu hình tiện ích mở rộng:

1. Mở Raycast → `Cmd + ,` → Extensions → AI Translator.
2. Cập nhật các trường sau:
   - **API Key**: Khóa API của bạn cho dịch vụ dịch (ví dụ: OpenAI).
   - **API URL**: URL cơ sở cho API (mặc định: `https://api.openai.com/v1/chat/completions`).
   - **AI Model**: Mô hình AI để sử dụng (mặc định: `gemini-pro`).
   - **Ngôn Ngữ Chính**: Ngôn ngữ chính của bạn (ví dụ: `Vietnamese`).
   - **Ngôn Ngữ Phụ**: Ngôn ngữ thứ hai của bạn (ví dụ: `English`).

### Cách Hoạt Động

 Tiện ích mở rộng sẽ tự động phát hiện ngôn ngữ nhập và định tuyến bản dịch một cách thông minh:

- **Chính → Phụ**: Nếu bạn nhập văn bản bằng ngôn ngữ chính, nó sẽ dịch sang ngôn ngữ phụ.
- **Phụ → Chính**: Nếu bạn nhập văn bản bằng ngôn ngữ phụ, nó sẽ dịch sang ngôn ngữ chính.
- **Khác → Chính**: Bất kỳ ngôn ngữ nào khác sẽ được dịch sang ngôn ngữ chính của bạn.

---

## Dành cho Nhà phát triển

### Bắt đầu

1. **Fork kho lưu trữ**: Fork kho lưu trữ này vào tài khoản GitHub của bạn.
2. **Clone kho lưu trữ đã fork**:
   ```bash
   git clone https://github.com/TEN_CUA_BAN/ai-translator.git
   cd ai-translator
   ```
3. **Cài đặt các gói phụ thuộc**:
   ```bash
   npm install
   ```
4. **Chạy chế độ phát triển**:
   ```bash
   npm run dev
   ```

### Xây dựng Extension

 Để tạo một bản dựng sản phẩm, hãy chạy:

```bash
 npm run build
```

### Xử lý sự cố

 Nếu bạn gặp lỗi `Could not find command's executable JS file`, hãy chạy các lệnh sau trong thư mục dự án của bạn:

```bash
 npm install && npm run build
```
