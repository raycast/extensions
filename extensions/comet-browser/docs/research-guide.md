# 研究指南 - 給 AI 助手的詳細說明

## 重要：研究工具和資源

### 1. 使用 Context7 MCP 工具研究文件

在開始開發前，**必須**使用 Context7 工具來獲取最新的 Raycast API 文件：

```
# 首先解析 library ID
使用 mcp__context7-mcp__resolve-library-id 
參數: libraryName = "raycast"

# 然後獲取文件
使用 mcp__context7-mcp__get-library-docs
參數: context7CompatibleLibraryID = "/raycast/api"
主題: "hooks", "components", "utilities"
```

**重要主題研究**：
- `useCachedPromise` - 資料快取和狀態管理
- `runAppleScript` - 與 macOS 應用程式整合
- `List` 和 `ActionPanel` - UI 元件
- `showToast` - 錯誤處理和使用者回饋

### 2. 研究 Arc 擴充套件原始碼

**關鍵檔案路徑**（已經在專案中）：
```
/Users/linyanyu/Desktop/20-29-Development/23-tools/23.02-external-tools/arc-extension-raycast/extensions/extensions/arc/
```

**必讀檔案**：
1. `src/arc.ts` - 學習 AppleScript 整合模式
2. `src/utils.ts` - 工具函數和錯誤處理
3. `src/types.ts` - TypeScript 類型定義
4. `src/search.tsx` - 統一搜尋實現
5. `src/hooks/` - 自定義 React Hooks 模式

**重點學習**：
- AppleScript 字串跳脫處理
- JSON 資料傳輸模式  
- 錯誤處理和降級策略
- 搜尋結果的 UI 呈現

### 3. Comet 瀏覽器研究

#### 3.1 檢查 AppleScript 支援
```bash
# 在 Terminal 執行
osascript -e 'tell application "System Events" to get name of every process whose name contains "Comet"'

# 測試基本命令
osascript -e 'tell application "Comet" to activate'
```

#### 3.2 尋找資料庫位置
```bash
# 可能的位置
find ~/Library -name "*Comet*" -type d 2>/dev/null
find ~/Library -name "*Perplexity*" -type d 2>/dev/null

# 檢查 Chromium 標準位置
ls -la ~/Library/Application\ Support/
```

#### 3.3 研究 URL Schemes
在 Comet 的 Info.plist 中尋找支援的 URL schemes：
```bash
# 解壓 app 查看 Info.plist
cd /Applications/Comet.app/Contents
cat Info.plist | grep -A 5 CFBundleURLSchemes
```

### 4. 必要的 npm 套件研究

使用 Context7 研究這些套件的用法：

```
# Fuse.js - 模糊搜尋
mcp__context7-mcp__resolve-library-id libraryName="fuse.js"
mcp__context7-mcp__get-library-docs context7CompatibleLibraryID="[獲得的ID]"

# use-debounce - 搜尋去抖動  
mcp__context7-mcp__resolve-library-id libraryName="use-debounce"
```

### 5. Raycast 特定研究

#### 5.1 命令模式研究
- `view` 模式 - 顯示 UI 的命令
- `no-view` 模式 - 執行後立即關閉
- `menu-bar` 模式 - 常駐選單列

#### 5.2 偏好設定系統
研究如何實現使用者偏好：
```typescript
export interface Preferences {
  searchEngine: "google" | "perplexity" | "duckduckgo";
  resultLimit: string; // "50" | "100" | "200"
  showFavicons: boolean;
}
```

## 開發流程建議

### 第一步：環境設置
1. 安裝相依套件：
   ```bash
   npm install fuse.js use-debounce
   npm install --save-dev @types/fuse.js
   ```

2. 設定 TypeScript 嚴格模式

### 第二步：建立基礎架構
1. 建立資料夾結構（如技術文件所述）
2. 實現基本的 TypeScript 類型
3. 建立錯誤處理框架

### 第三步：實現瀏覽器整合
1. **優先嘗試 AppleScript**
2. 如果失敗，研究資料庫存取
3. 實現降級機制

### 第四步：建立 UI 元件
參考 Arc 擴充套件的元件結構：
- `TabListItem` - 顯示分頁資訊
- `HistoryListItem` - 顯示歷史記錄
- `ActionPanel` - 提供操作選項

### 第五步：實現搜尋功能
1. 整合 Fuse.js
2. 實現搜尋排序邏輯
3. 加入去抖動處理

## 關鍵技術挑戰和解決方案

### 挑戰 1：Comet API 存取
**研究步驟**：
1. 檢查 `/Applications/Comet.app/Contents/Resources/` 是否有 `.sdef` 檔案（AppleScript 定義）
2. 使用 `strings` 命令檢查執行檔中的 URL schemes
3. 監控 Comet 的網路請求找出可能的 API 端點

### 挑戰 2：資料同步
**解決方案**：
- 使用 `useCachedPromise` 的 `revalidate` 功能
- 實現智慧快取更新策略
- 考慮使用 WebSocket 或輪詢更新

### 挑戰 3：效能優化
**研究重點**：
- 虛擬列表渲染（大量結果時）
- 延遲載入策略
- 記憶體使用優化

## 測試和除錯

### 1. 開發模式除錯
```bash
# 啟動開發模式
npm run dev

# 查看 console 輸出
# Raycast > Extensions > [Extension Name] > View Logs
```

### 2. AppleScript 除錯
使用 Script Editor 單獨測試 AppleScript 程式碼

### 3. 效能分析
使用 Chrome DevTools 的 Performance 分析工具

## 重要提醒

1. **始終檢查 Comet 是否正在執行**
2. **處理權限問題**（特別是資料庫存取）
3. **提供清晰的錯誤訊息**
4. **遵循 Raycast 的 UI 指南**
5. **確保快捷鍵不衝突**

## 參考資源

1. **Raycast 官方文件**: https://developers.raycast.com
2. **Arc 擴充套件原始碼**: 本地專案中
3. **Chromium 專案文件**: 了解資料庫結構
4. **AppleScript Language Guide**: Apple 官方文件

## 給 AI 助手的特別說明

在開始編碼前，請：
1. 使用 Context7 工具深入研究 Raycast API
2. 仔細閱讀 Arc 擴充套件的實現
3. 測試 Comet 的各種整合方式
4. 優先考慮使用者體驗和效能
5. 保持程式碼的可維護性和擴展性

記住：這個擴充套件的目標是提供**快速、準確、直覺**的搜尋體驗。每個技術決策都應該圍繞這個目標。