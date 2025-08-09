# 實作筆記 - Comet Browser Raycast 擴充套件

## 專案背景

這個專案的目標是為 Perplexity 的 Comet 瀏覽器建立一個 Raycast 擴充套件，提供類似 Arc 瀏覽器擴充套件的功能。主要功能包括搜尋開啟的分頁、搜尋瀏覽歷史，以及統一搜尋介面。

## 為什麼參考 Arc 擴充套件？

Arc 擴充套件是一個成熟且功能完整的 Raycast 瀏覽器擴充套件範例，它展示了：

1. **完整的瀏覽器整合模式** - 包括 AppleScript、資料庫存取等多種方法
2. **優秀的錯誤處理** - 優雅降級和使用者友好的錯誤訊息
3. **高效的搜尋實現** - 使用 Fuse.js 和智慧排序
4. **良好的使用者體驗** - 快速響應、豐富的操作選項

## 技術挑戰

### 1. Comet 瀏覽器的限制

與 Arc 不同，Comet 是一個較新的瀏覽器，可能：
- 沒有完整的 AppleScript 支援
- 沒有公開的 API 文件
- 資料儲存位置可能不同

**解決策略**：
- 實現多種整合方式，確保至少有一種可以運作
- 使用 Chromium 的標準結構作為參考
- 準備降級方案

### 2. 資料存取

Comet 基於 Chromium，理論上應該有類似的資料結構：
- SQLite 資料庫儲存歷史記錄
- JSON 檔案儲存設定和狀態

**研究重點**：
```bash
# 尋找 Comet 的資料目錄
find ~/Library -name "*Comet*" -o -name "*Perplexity*" 2>/dev/null
```

### 3. 即時資料同步

獲取「目前開啟的分頁」比獲取歷史記錄更具挑戰性，因為需要與執行中的瀏覽器通訊。

**可能的解決方案**：
1. AppleScript（如果支援）
2. Chrome DevTools Protocol（需要啟用遠端除錯）
3. 瀏覽器擴充套件橋接（複雜但可靠）
4. UI 自動化（最後手段）

## 實作策略

### 階段性開發

#### 第一階段：最小可行產品 (MVP)
目標：實現基本的 URL 開啟功能

```typescript
// 最簡單的實現 - 在 Comet 開啟 URL
export async function openInComet(url: string) {
  // 嘗試多種方法
  try {
    await open(`comet://${url}`);
  } catch {
    await open(url, { app: "Comet" });
  }
}
```

#### 第二階段：歷史記錄搜尋
目標：存取和搜尋瀏覽歷史

1. 找到資料庫位置
2. 使用 `useSQL` hook 查詢
3. 實現搜尋和過濾

#### 第三階段：分頁管理
目標：獲取和管理開啟的分頁

1. 研究 AppleScript 支援
2. 實現分頁列表獲取
3. 加入分頁切換功能

#### 第四階段：完整功能
目標：統一搜尋、優化效能、完善體驗

## 關鍵程式碼片段

### 1. 智慧整合檢測

```typescript
// 自動檢測最佳整合方式
export async function detectBestIntegration(): Promise<IntegrationMethod> {
  // 檢查 AppleScript
  if (await checkAppleScriptSupport()) {
    return 'applescript';
  }
  
  // 檢查資料庫
  if (await checkDatabaseAccess()) {
    return 'database';
  }
  
  // 檢查 URL schemes
  if (await checkURLSchemes()) {
    return 'urlscheme';
  }
  
  return 'basic';
}
```

### 2. 統一的資料介面

```typescript
// 無論使用哪種方法，都返回統一的資料格式
interface BrowserDataProvider {
  getTabs(): Promise<CometTab[]>;
  getHistory(limit: number): Promise<CometHistoryEntry[]>;
  switchToTab(tabId: string): Promise<void>;
  openUrl(url: string): Promise<void>;
}

// 實現不同的 Provider
class AppleScriptProvider implements BrowserDataProvider { }
class DatabaseProvider implements BrowserDataProvider { }
class BasicProvider implements BrowserDataProvider { }
```

### 3. 搜尋優化

```typescript
// 智慧搜尋排序
function rankSearchResults(results: SearchResult[]): SearchResult[] {
  return results.sort((a, b) => {
    // 開啟的分頁永遠優先
    if (a.type === 'tab' && b.type === 'history') return -1;
    if (a.type === 'history' && b.type === 'tab') return 1;
    
    // 相同類型按相關性排序
    return a.score - b.score;
  });
}
```

## 使用者體驗考量

### 1. 首次使用體驗
- 自動檢測 Comet 是否安裝
- 提供清晰的設置指引
- 優雅處理權限請求

### 2. 搜尋體驗
- 即時搜尋結果（< 100ms）
- 智慧搜尋建議
- 鍵盤導航優化

### 3. 錯誤處理
- 永不崩潰原則
- 提供可操作的錯誤訊息
- 自動嘗試修復

## 開發小技巧

### 1. 使用 Raycast 的開發工具
```bash
# 即時重載
npm run dev

# 查看日誌
Raycast > Extensions > Comet Browser > View Logs
```

### 2. AppleScript 除錯
使用 Script Editor 單獨測試 AppleScript，確保語法正確後再整合。

### 3. TypeScript 嚴格模式
啟用所有嚴格檢查，避免執行時錯誤：
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

## 未來改進方向

### 1. 進階功能
- 分頁分組管理
- 閱讀清單整合
- 書籤搜尋
- 下載管理

### 2. AI 整合
利用 Comet 的 AI 特性：
- 智慧搜尋建議
- 內容摘要
- 相關頁面推薦

### 3. 效能優化
- 背景資料預載
- 增量搜尋更新
- 智慧快取策略

## 給開發者的建議

1. **從簡單開始** - 先實現基本功能，再逐步優化
2. **注重錯誤處理** - 使用者體驗比功能完整更重要
3. **保持程式碼整潔** - 未來的你會感謝現在的你
4. **經常測試** - 在真實環境中使用你的擴充套件
5. **聽取回饋** - 使用者的需求可能與你想的不同

## 結語

這個專案是一個很好的學習機會，可以了解：
- Raycast 擴充套件開發
- 瀏覽器自動化技術
- TypeScript 和 React 最佳實踐
- 使用者體驗設計

記住，最好的擴充套件不是功能最多的，而是最好用的。專注於核心功能，做到極致。

祝開發順利！ 🚀