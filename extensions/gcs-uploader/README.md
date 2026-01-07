# 📖 Hướng dẫn cấu hình GCS Uploader

Tiện ích này cho phép bạn tải tệp lên Google Cloud Storage (GCS) một cách nhanh chóng từ clipboard hoặc file chọn thủ công. Dưới đây là các bước để cấu hình đầy đủ.

## 1. Cấu hình Google Cloud Storage (GCS)

### **A. Tạo Project và Bucket**
1. Truy cập [Google Cloud Console](https://console.cloud.google.com/).
2. Tạo một Project mới (nếu chưa có).
3. Tìm kiếm **"Cloud Storage"** -> **Buckets**.
4. Chọn **CREATE** để tạo bucket mới.
   - **Name**: Nhập tên bucket (Ví dụ: `my-raycast-uploads`). *Tên này sẽ được điền vào mục **GCS Bucket Name** trong cài đặt Raycast.*
   - **Location**: Chọn vùng gần bạn (Ví dụ: `asia-southeast1` cho Việt Nam).
   - Các cài đặt khác có thể để mặc định.

### **B. Cấp quyền Công khai (Public Access)**
Để các link ảnh/tệp có thể xem được trực tiếp từ trình duyệt, bạn cần cấu hình Bucket sang chế độ Public:
1. Vào tab **Permissions** của bucket vừa tạo.
2. Kiểm tra mục **"Public access"**. Nếu đang ở trạng thái "Blocked", hãy chọn **EDIT ACCESS CONTROL** và bỏ tích "Enforce public access prevention".
3. Nhấp vào nút **ADD PRINCIPAL**.
   - **New principals**: Nhập `allUsers`.
   - **Role**: Chọn `Cloud Storage` -> `Storage Object Viewer`.
4. Nhấn **SAVE** và xác nhận **ALLOW PUBLIC ACCESS**.

---

## 2. Cấu hình Xác thực (Authentication)

Tiện ích hỗ trợ 2 cách xác thực chính:

### **Cách 1: Sử dụng gcloud CLI (Khuyên dùng)**
Đây là cách ổn định nhất vì tiện ích sẽ tự động lấy token mới mỗi khi cần.
1. Cài đặt [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) trên máy của bạn.
2. Mở Terminal và chạy lệnh đăng nhập:
   ```bash
   gcloud auth login
   ```
3. Sau khi đăng nhập thành công, trong phần **Settings** của Extension trên Raycast:
   - Bật tùy chọn **"Use gcloud CLI for authentication"**.

### **Cách 2: Sử dụng Access Token tĩnh**
Nếu bạn không muốn cài đặt CLI, bạn có thể lấy token thủ công, nhưng lưu ý token này thường hết hạn sau 60 phút.
1. Lấy token bằng lệnh `gcloud auth print-access-token` (nếu đã có CLI) hoặc từ Google OAuth Playground.
2. Dán vào mục **Access Token** trong cài đặt Raycast.
3. Tắt tùy chọn **"Use gcloud CLI for authentication"**.

---

## 3. Cấu hình CDN Link (Tùy chọn)

Nếu bạn sử dụng một dịch vụ CDN (như CMC Cloud, Cloudflare) hoặc Custom Domain trỏ vào GCS để tăng tốc độ tải và có link đẹp hơn:

1. **CDN Base URL**: Nhập địa chỉ CDN của bạn (Ví dụ: `https://cdn.example.com`).
2. Nếu mục này có dữ liệu, link trả về sẽ có dạng: `https://cdn.example.com/pasterly/tên-file.png`.
3. Nếu để trống, link mặc định sẽ là: `https://storage.googleapis.com/tên-bucket/pasterly/tên-file.png`.

*Lưu ý: Mọi tệp tải lên sẽ được mặc định lưu trong thư mục `pasterly/` trong bucket của bạn.*

---

## 4. Các thông số cài đặt trong Raycast
- **Storage Provider**: Giữ mặc định là `gcs`.
- **GCS Bucket Name**: Tên Bucket bạn đã tạo ở Bước 1A.
- **Fixed Size**: Kích thước ảnh (chiều rộng) bạn muốn đính kèm vào editor (Ví dụ: `1000`). Để `0` nếu chỉ muốn lấy URL thuần túy.

---

### 💡 Lưu ý quan trọng
- **Bảo mật**: Khi đặt bucket ở chế độ `allUsers`, bất kỳ ai có link đều có thể xem tệp. Tránh upload các dữ liệu nhạy cảm.
- **Thư mục lưu trữ**: Hiện tại tiện ích đang cố định thư mục lưu trữ là `pasterly/`. Bạn có thể tìm thấy các tệp đã upload tại đây trong giao diện Cloud Storage Console.
