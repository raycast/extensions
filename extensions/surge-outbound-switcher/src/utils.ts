import { showHUD } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";
import { LocalStorage } from "@raycast/api";

// Add local storage key name
const SURGE_MODE_STORAGE_KEY = "surge-current-mode";

// Cache Surge running status to avoid frequent AppleScript calls
let surgeRunningCache: { isRunning: boolean | null; timestamp: number } = {
  isRunning: null,
  timestamp: 0,
};

// Cache Surge icon position to speed up menu operations
let surgeIconCache: { menuBarIndex: number | null; itemIndex: number | null; timestamp: number } = {
  menuBarIndex: null,
  itemIndex: null,
  timestamp: 0,
};

// Extended cache validity for menu position (30 seconds)
const CACHE_VALIDITY_MS = 3000;
const POSITION_CACHE_VALIDITY_MS = 30000;

/**
 * Checks if Surge is running
 * @returns Promise<boolean> indicating whether Surge is running
 */
export async function isSurgeRunning(): Promise<boolean> {
  const now = Date.now();

  // If cache is valid, return cached result directly
  if (surgeRunningCache.isRunning !== null && now - surgeRunningCache.timestamp < CACHE_VALIDITY_MS) {
    return surgeRunningCache.isRunning;
  }

  try {
    // Use simpler and more efficient shell command to check if process exists
    const script = `do shell script "pgrep -x Surge > /dev/null && echo 'running' || echo 'not running'"`;

    const result = await runAppleScript(script);
    const isRunning = result.trim() === "running";

    // Update cache
    surgeRunningCache = {
      isRunning,
      timestamp: now,
    };

    return isRunning;
  } catch (error) {
    console.error("Error checking if Surge is running:", error);
    return false;
  }
}

// Menu item mapping object, contains both English and Chinese names
const outboundModes = {
  Direct: {
    english: "Direct Outbound",
    chinese: "直接连接",
    name: "Direct",
  },
  Global: {
    english: "Global Proxy",
    chinese: "全局代理",
    name: "Global",
  },
  Rule: {
    english: "Rule-Based Proxy",
    chinese: "规则判定",
    name: "Rule-Based",
  },
};

/**
 * Executes an AppleScript to set Surge outbound mode
 * This function handles the UI interaction with Surge's menu bar to change the outbound mode
 * @param mode The outbound mode to set to ("Direct", "Global", or "Rule")
 * @returns Promise<void>
 */
export async function setSurgeOutboundMode(mode: "Direct" | "Global" | "Rule"): Promise<void> {
  try {
    // Verify Surge is running before attempting to set modes
    const isSurgeActive = await isSurgeRunning();
    if (!isSurgeActive) {
      await showHUD("🔴 Surge is not running");
      // Reset icon position cache when Surge is not running
      surgeIconCache = { menuBarIndex: null, itemIndex: null, timestamp: 0 };
      return;
    }

    const modeConfig = outboundModes[mode];

    // 预先提取需要的变量值，避免在AppleScript中使用JavaScript变量插值
    const chineseName = modeConfig.chinese;
    const englishName = modeConfig.english;

    // Get cached icon position if available
    const now = Date.now();
    const cachedMenuBar =
      surgeIconCache.menuBarIndex !== null && now - surgeIconCache.timestamp < POSITION_CACHE_VALIDITY_MS
        ? surgeIconCache.menuBarIndex
        : 2; // Default to menu bar 2

    const cachedItemIndex =
      surgeIconCache.itemIndex !== null && now - surgeIconCache.timestamp < POSITION_CACHE_VALIDITY_MS
        ? surgeIconCache.itemIndex
        : 0; // Will be ignored if 0

    // AppleScript to automate the UI interaction:
    // 1. Click the Surge menu bar icon
    // 2. Find the Outbound Mode menu item
    // 3. Click the specific mode option
    const script = `
    tell application "System Events"
      -- First make sure Surge is running
      set surgeRunning to exists process "Surge"
      if not surgeRunning then
        error "Surge is not running"
      end if

      -- Surge is a status bar app, no need to make it frontmost
      -- Just add a small delay to ensure it's ready
      delay 0.1

      -- Define retry mechanism
      set maxRetries to 3
      set currentTry to 0
      set success to false

      -- Store cached position (will be updated if successful)
      set cachedMenuBar to ${cachedMenuBar}
      set cachedItemIndex to ${cachedItemIndex}
      set foundMenuBar to 0
      set foundItemIndex to 0

      -- Store mode names to compare later (instead of string interpolation)
      set chineseModeName to "${chineseName}"
      set englishModeName to "${englishName}"

      repeat while currentTry < maxRetries and not success
        set currentTry to currentTry + 1

        try
          tell process "Surge"
            -- Find the Surge status bar icon in menu bar 2
            set foundSurgeItem to false

            -- First try the cached position if valid
            if cachedItemIndex > 0 then
              try
                -- Try to use the cached position first
                set menuBarItem to menu bar item cachedItemIndex of menu bar cachedMenuBar

                -- Click the item to see if it brings up the Surge menu
                click menuBarItem
                delay 0.1

                -- Try to find Outbound Mode to verify this is Surge
                set theMenu to menu 1 of menuBarItem
                set foundOutboundMode to false

                repeat with j from 1 to count of menu items of theMenu
                  try
                    set thisItem to menu item j of theMenu
                    if name of thisItem is "出站模式" or name of thisItem is "Outbound Mode" then
                      -- This is indeed the Surge menu
                      set foundOutboundMode to true
                      set foundSurgeItem to true
                      set foundMenuBar to cachedMenuBar
                      set foundItemIndex to cachedItemIndex

                      -- Click the Outbound Mode menu item
                      click thisItem
                      delay 0.1

                      -- Get submenu and click corresponding option
                      set modeFound to false
                      set subMenu to menu 1 of thisItem

                      -- Use predefined Chinese/English names for exact matching
                      repeat with k from 1 to count of menu items of subMenu
                        try
                          set subItem to menu item k of subMenu
                          set subName to name of subItem

                          if subName is chineseModeName or subName is englishModeName then
                            click subItem
                            set modeFound to true
                            set success to true
                            exit repeat
                          end if
                        end try
                      end repeat

                      if not modeFound then
                        -- We found Outbound Mode but not the target mode option
                        try
                          tell theMenu to cancel
                        end try
                        error "Could not find the specified outbound mode"
                      end if

                      exit repeat
                    end if
                  end try
                end repeat

                if not foundOutboundMode then
                  -- This wasn't the Surge menu, close it
                  try
                    tell theMenu to cancel
                  on error
                    keystroke escape
                  end try
                end if
              on error
                -- Cached position failed, will continue with normal search
                try
                  keystroke escape
                end try
              end try
            end if

            -- If cached position didn't work, do a full search
            if not foundSurgeItem then
              -- Get count of items in menu bar 2
              set itemCount to count of menu bar items of menu bar 2

              -- Look through items to find Surge icon
              set i to 1
              repeat while not foundSurgeItem and i ≤ itemCount
                try
                  -- Try to get name or description of menu bar item before clicking
                  set menuBarItem to menu bar item i of menu bar 2

                  -- Click the item to see if it brings up the Surge menu
                  click menuBarItem
                  delay 0.1

                  -- Try to find "Outbound Mode" in the opened menu
                  set theMenu to menu 1 of menuBarItem
                  set mCount to count of menu items of theMenu

                  set outboundFound to false
                  set outboundItem to null

                  repeat with j from 1 to mCount
                    try
                      set thisItem to menu item j of theMenu
                      set itemName to name of thisItem

                      if itemName is "出站模式" or itemName is "Outbound Mode" then
                        set outboundFound to true
                        set outboundItem to thisItem
                        set foundSurgeItem to true
                        set foundMenuBar to 2
                        set foundItemIndex to i
                        exit repeat
                      end if
                    end try
                  end repeat

                  if outboundFound then
                    -- Click the Outbound Mode menu item
                    click outboundItem
                    delay 0.1

                    -- Get submenu and click corresponding option
                    set modeFound to false
                    set subMenu to menu 1 of outboundItem

                    -- Use predefined Chinese/English names for exact matching
                    repeat with k from 1 to count of menu items of subMenu
                      try
                        set subItem to menu item k of subMenu
                        set subName to name of subItem

                        if subName is chineseModeName or subName is englishModeName then
                          click subItem
                          set modeFound to true
                          set success to true
                          exit repeat
                        end if
                      end try
                    end repeat

                    if not modeFound then
                      -- We found Outbound Mode but not the target mode option
                      try
                        tell theMenu to cancel
                      end try
                      error "Could not find the specified outbound mode"
                    end if
                  else
                    -- This wasn't the Surge menu, close it
                    try
                      tell theMenu to cancel
                    on error
                      -- Fallback if cancel fails
                      keystroke escape
                    end try
                  end if
                on error errMsg
                  -- Try to properly close any open menu
                  try
                    keystroke escape
                  end try
                end try

                set i to i + 1
              end repeat
            end if

            if not foundSurgeItem then
              error "Could not find Surge menu bar icon in menu bar 2"
            end if
          end tell

        on error errMsg
          -- If this wasn't the last try, delay before retrying
          if currentTry < maxRetries then
            delay 0.3
          else
            error errMsg
          end if
        end try
      end repeat

      if not success then
        error "Failed to set Surge outbound mode after multiple attempts"
      end if

      -- Return both success status and the icon position if found
      return "{\\"position\\":[" & foundMenuBar & "," & foundItemIndex & "]}"
    end tell
    `;

    // Execute the AppleScript and show success message
    const result = await runAppleScript(script);

    // Parse and update the icon position cache if available
    try {
      // Use a simpler format for parsing position
      const match = result.match(/\[(\d+),(\d+)\]/);
      if (match && match.length === 3) {
        const menuBarIdx = parseInt(match[1], 10);
        const itemIdx = parseInt(match[2], 10);
        if (menuBarIdx > 0 && itemIdx > 0) {
          surgeIconCache = {
            menuBarIndex: menuBarIdx,
            itemIndex: itemIdx,
            timestamp: Date.now(),
          };
        }
      }
    } catch {
      // Ignore parsing errors, just don't update cache
    }

    // Save current mode to local storage
    await LocalStorage.setItem(SURGE_MODE_STORAGE_KEY, mode);

    await showHUD(`🌐 Set to ${modeConfig.name} Mode`);
  } catch (error) {
    // Handle errors and show failure notification
    console.error(`🔴 Error setting to ${outboundModes[mode].name} mode:`, error);

    // 将错误转换为字符串，检查是否包含无法找到图标的错误信息
    const errorStr = String(error);

    // 检查错误是否与找不到 Surge 图标相关
    if (
      errorStr.includes("Could not find Surge menu bar icon in menu bar 2") ||
      errorStr.includes("Unable to locate Surge in menu bar")
    ) {
      // 当无法找到 Surge 图标时显示特定提示
      await showHUD("🟡 Activate Surge Menu once after launch");

      // 重置图标位置缓存，以便下次尝试重新搜索
      surgeIconCache = { menuBarIndex: null, itemIndex: null, timestamp: 0 };
    } else {
      // 其他错误处理
      await showFailureToast(error, { title: "Set failed" });
    }
  }
}

/**
 * Gets the current Surge outbound mode from local storage
 * Simplified function that only retrieves the last used mode from local storage
 * @returns Promise<"Direct" | "Global" | "Rule" | null> the last used outbound mode or null if not found
 */
export async function getCurrentSurgeOutboundMode(): Promise<"Direct" | "Global" | "Rule" | null> {
  try {
    // Get the last used mode directly from local storage
    const storedMode = await LocalStorage.getItem<"Direct" | "Global" | "Rule">(SURGE_MODE_STORAGE_KEY);
    console.log("Mode retrieved from local storage:", storedMode);

    if (storedMode === "Direct" || storedMode === "Global" || storedMode === "Rule") {
      return storedMode;
    }

    return null;
  } catch (error) {
    console.error("Error getting stored Surge mode:", error);
    return null;
  }
}
