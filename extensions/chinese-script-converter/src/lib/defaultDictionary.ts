import { DictEntry } from "./storage";

/**
 * A curated preset of common vocabulary differences between Traditional
 * Chinese (Taiwan usage) and Simplified Chinese (Mainland usage).
 *
 * These are WORD-level differences that character-by-character conversion
 * (OpenCC) does not handle. For example OpenCC turns 数据库 into 數據庫, but the
 * idiomatic Taiwan term is 資料庫. Each entry maps the Taiwan form to the
 * Mainland form.
 *
 * Compiled from common cross-strait terminology references (e.g. the
 * "海峽兩岸用語對照" lists and the OpenCC TWPhrases dictionaries).
 */
export const DEFAULT_DICTIONARY: DictEntry[] = [
  // --- Computing / software ---
  { traditional: "軟體", simplified: "软件" },
  { traditional: "硬體", simplified: "硬件" },
  { traditional: "韌體", simplified: "固件" },
  { traditional: "程式", simplified: "程序" },
  { traditional: "程式設計", simplified: "编程" },
  { traditional: "程式碼", simplified: "代码" },
  { traditional: "原始碼", simplified: "源代码" },
  { traditional: "應用程式", simplified: "应用程序" },
  { traditional: "作業系統", simplified: "操作系统" },
  { traditional: "資料庫", simplified: "数据库" },
  { traditional: "資訊", simplified: "信息" },
  { traditional: "記憶體", simplified: "内存" },
  { traditional: "硬碟", simplified: "硬盘" },
  { traditional: "光碟", simplified: "光盘" },
  { traditional: "隨身碟", simplified: "U盘" },
  { traditional: "螢幕", simplified: "屏幕" },
  { traditional: "滑鼠", simplified: "鼠标" },
  { traditional: "印表機", simplified: "打印机" },
  { traditional: "列印", simplified: "打印" },
  { traditional: "掃描器", simplified: "扫描仪" },
  { traditional: "解析度", simplified: "分辨率" },
  { traditional: "畫素", simplified: "像素" },
  { traditional: "位元組", simplified: "字节" },
  { traditional: "位元", simplified: "比特" },

  // --- Programming concepts ---
  { traditional: "函式", simplified: "函数" },
  { traditional: "變數", simplified: "变量" },
  { traditional: "陣列", simplified: "数组" },
  { traditional: "字串", simplified: "字符串" },
  { traditional: "迴圈", simplified: "循环" },
  { traditional: "佇列", simplified: "队列" },
  { traditional: "堆疊", simplified: "栈" },
  { traditional: "除錯", simplified: "调试" },
  { traditional: "快取", simplified: "缓存" },
  { traditional: "封包", simplified: "数据包" },

  // --- Network / internet ---
  { traditional: "網路", simplified: "网络" },
  { traditional: "網際網路", simplified: "互联网" },
  { traditional: "伺服器", simplified: "服务器" },
  { traditional: "頻寬", simplified: "带宽" },
  { traditional: "連結", simplified: "链接" },
  { traditional: "網誌", simplified: "博客" },
  { traditional: "影片", simplified: "视频" },
  { traditional: "數據機", simplified: "调制解调器" },

  // --- UI terms ---
  { traditional: "介面", simplified: "界面" },
  { traditional: "視窗", simplified: "窗口" },
  { traditional: "選單", simplified: "菜单" },
  { traditional: "工具列", simplified: "工具栏" },
  { traditional: "對話方塊", simplified: "对话框" },
  { traditional: "下拉式選單", simplified: "下拉菜单" },
  { traditional: "設定", simplified: "设置" },
  { traditional: "預設", simplified: "默认" },
  { traditional: "登入", simplified: "登录" },
  { traditional: "搜尋", simplified: "搜索" },
  { traditional: "點選", simplified: "点击" },
  { traditional: "貼上", simplified: "粘贴" },
  { traditional: "剪下", simplified: "剪切" },
  { traditional: "捷徑", simplified: "快捷方式" },
  { traditional: "資料夾", simplified: "文件夹" },
  { traditional: "檔案", simplified: "文件" },
  { traditional: "安裝", simplified: "安装" },
  { traditional: "解除安裝", simplified: "卸载" },

  // --- Devices ---
  { traditional: "筆記型電腦", simplified: "笔记本电脑" },
  { traditional: "桌上型電腦", simplified: "台式电脑" },
  { traditional: "智慧型手機", simplified: "智能手机" },
  { traditional: "行動電話", simplified: "移动电话" },
  { traditional: "簡訊", simplified: "短信" },
  { traditional: "攝影機", simplified: "摄像机" },
  { traditional: "雷射", simplified: "激光" },

  // --- Everyday life ---
  { traditional: "計程車", simplified: "出租车" },
  { traditional: "機車", simplified: "摩托车" },
  { traditional: "腳踏車", simplified: "自行车" },
  { traditional: "公車", simplified: "公交车" },
  { traditional: "捷運", simplified: "地铁" },
  { traditional: "鳳梨", simplified: "菠萝" },
  { traditional: "番茄", simplified: "西红柿" },
  { traditional: "泡麵", simplified: "方便面" },
  { traditional: "優格", simplified: "酸奶" },
  { traditional: "起司", simplified: "奶酪" },
  { traditional: "冷氣", simplified: "空调" },
  { traditional: "影印", simplified: "复印" },
  { traditional: "幼稚園", simplified: "幼儿园" },
  { traditional: "服務生", simplified: "服务员" },
  { traditional: "影集", simplified: "电视剧" },
];
