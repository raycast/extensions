using System.Collections.Concurrent;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
using System.Windows.Automation;

namespace BrowserTabsHelper;

/// <summary>
/// 浏览器标签页辅助工具 - 使用 Windows UI Automation
/// </summary>
class Program
{
    // 支持的 Chromium 浏览器进程名
    private static readonly HashSet<string> ChromiumProcessNames = new(
        new[] { "msedge", "chrome", "brave", "vivaldi", "opera", "chromium" },
        StringComparer.OrdinalIgnoreCase);

    // 支持的 Firefox 浏览器进程名
    private static readonly HashSet<string> FirefoxProcessNames = new(
        new[] { "firefox" },
        StringComparer.OrdinalIgnoreCase);

    // 缓存的标签页列表（用于 activate/close 操作）
    private static List<BrowserTab>? _cachedTabs;

    static int Main(string[] args)
    {
        if (args.Length == 0)
        {
            PrintUsage();
            return 1;
        }

        var command = args[0].ToLower();

        try
        {
            switch (command)
            {
                case "list":
                    return ListTabs();
                case "bookmarks":
                    return ListBookmarks();
                case "debug":
                    return DebugInfo();
                case "activate":
                    if (args.Length < 2 || !int.TryParse(args[1], out var activateIndex))
                    {
                        Console.Error.WriteLine("Error: 需要提供标签页索引");
                        return 1;
                    }
                    return ActivateTab(activateIndex);
                case "close":
                    if (args.Length < 2 || !int.TryParse(args[1], out var closeIndex))
                    {
                        Console.Error.WriteLine("Error: 需要提供标签页索引");
                        return 1;
                    }
                    return CloseTab(closeIndex);
                case "open-manager":
                    if (args.Length < 2)
                    {
                        Console.Error.WriteLine("Error: 需要提供浏览器名称");
                        return 1;
                    }
                    return OpenBookmarkManager(args[1]);
                default:
                    PrintUsage();
                    return 1;
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Error: {ex.Message}");
            return 1;
        }
    }

    static void PrintUsage()
    {
        Console.WriteLine("用法:");
        Console.WriteLine("  browser-tabs-helper list              列出所有标签页 (JSON)");
        Console.WriteLine("  browser-tabs-helper bookmarks         列出所有书签 (JSON)");
        Console.WriteLine("  browser-tabs-helper activate <index>  激活指定索引的标签页");
        Console.WriteLine("  browser-tabs-helper close <index>     关闭指定索引的标签页");
    }

    static int ListTabs()
    {
        var tabs = GetAllTabs();
        _cachedTabs = tabs;
        
        var tabList = tabs.Select((tab, index) => new TabInfo
        {
            Index = index,
            Title = tab.Title,
            TabGroup = tab.TabGroup,
            WindowTitle = tab.WindowTitle,
            Browser = tab.BrowserName,
            IsMinimized = tab.IsMinimized
        }).ToList();

        var json = JsonSerializer.Serialize(tabList, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = false
        });

        Console.OutputEncoding = Encoding.UTF8;
        Console.WriteLine(json);
        return 0;
    }

    static int ListBookmarks()
    {
        var bookmarks = new List<BookmarkInfo>();
        var localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);

        // Chrome Bookmarks
        var chromePath = Path.Combine(localAppData, @"Google\Chrome\User Data\Default\Bookmarks");
        if (File.Exists(chromePath))
        {
            bookmarks.AddRange(GetBookmarksFromFile(chromePath, "Chrome"));
        }

        // Edge Bookmarks
        var edgePath = Path.Combine(localAppData, @"Microsoft\Edge\User Data\Default\Bookmarks");
        if (File.Exists(edgePath))
        {
            bookmarks.AddRange(GetBookmarksFromFile(edgePath, "Edge"));
        }

        // Brave Bookmarks
        var bravePath = Path.Combine(localAppData, @"BraveSoftware\Brave-Browser\User Data\Default\Bookmarks");
        if (File.Exists(bravePath))
        {
            bookmarks.AddRange(GetBookmarksFromFile(bravePath, "Brave"));
        }

        var json = JsonSerializer.Serialize(bookmarks, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = false
        });

        Console.OutputEncoding = Encoding.UTF8;
        Console.WriteLine(json);
        return 0;
    }

    static List<BookmarkInfo> GetBookmarksFromFile(string path, string browserName)
    {
        var results = new List<BookmarkInfo>();
        try
        {
            var json = File.ReadAllText(path);
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement.GetProperty("roots");
            
            // Process bookmark bar
            if (root.TryGetProperty("bookmark_bar", out var bar))
            {
                ProcessBookmarkNode(bar, "", browserName, results);
            }
            // Process other bookmarks
            if (root.TryGetProperty("other", out var other))
            {
                ProcessBookmarkNode(other, "", browserName, results);
            }
            // Process synced bookmarks (mobile)
            if (root.TryGetProperty("synced", out var synced))
            {
                ProcessBookmarkNode(synced, "", browserName, results);
            }
        }
        catch (Exception ex)
        {
            // Ignore errors for individual files
             Console.Error.WriteLine($"Error reading bookmarks from {path}: {ex.Message}");
        }
        return results;
    }

    static void ProcessBookmarkNode(JsonElement node, string path, string browserName, List<BookmarkInfo> results)
    {
        if (node.TryGetProperty("type", out var type) && type.GetString() == "url")
        {
            if (node.TryGetProperty("name", out var name) && node.TryGetProperty("url", out var url))
            {
                results.Add(new BookmarkInfo
                {
                    Title = name.GetString() ?? "",
                    Url = url.GetString() ?? "",
                    Folder = path,
                    Browser = browserName
                });
            }
        }
        else if (node.TryGetProperty("children", out var children) && children.ValueKind == JsonValueKind.Array)
        {
            string currentName = "";
            if (node.TryGetProperty("name", out var nameProp))
            {
                currentName = nameProp.GetString() ?? "";
            }

            string newPath = string.IsNullOrEmpty(path) ? currentName : (string.IsNullOrEmpty(currentName) ? path : $"{path}/{currentName}");
            // Special case for root folders to avoid empty or redundant paths
            if (path == "" && (currentName == "Bookmarks bar" || currentName == "Other bookmarks"))
            {
                newPath = ""; // Reset for root folders to keep paths clean
            }
            
            foreach (var child in children.EnumerateArray())
            {
                ProcessBookmarkNode(child, newPath, browserName, results);
            }
        }
    }

    static int DebugInfo()
    {
        Console.OutputEncoding = Encoding.UTF8;
        Console.WriteLine("=== 调试信息 ===");
        
        // 列出所有浏览器进程
        Console.WriteLine("\n[1] 查找浏览器进程...");
        var processes = Process.GetProcesses();
        var browserProcesses = processes.Where(p => 
            ChromiumProcessNames.Contains(p.ProcessName) || 
            FirefoxProcessNames.Contains(p.ProcessName)).ToList();
        
        Console.WriteLine($"找到 {browserProcesses.Count} 个浏览器进程:");
        foreach (var p in browserProcesses)
        {
            Console.WriteLine($"  - {p.ProcessName} (PID: {p.Id})");
        }
        
        // 列出所有浏览器窗口
        Console.WriteLine("\n[2] 查找浏览器窗口...");
        var browserWindows = GetAllBrowserWindows();
        Console.WriteLine($"找到 {browserWindows.Count} 个浏览器窗口");
        
        // 尝试获取标签页
        Console.WriteLine("\n[3] 尝试获取标签页...");
        foreach (var window in browserWindows)
        {
            try
            {
                var process = Process.GetProcessById(window.processId);
                var mainWindow = AutomationElement.FromHandle(window.hwnd);
                
                var sb = new StringBuilder(256);
                NativeMethods.GetWindowText(window.hwnd, sb, sb.Capacity);
                string windowTitle = sb.ToString();

                Console.WriteLine($"  窗口: {process.ProcessName} (HWND: {window.hwnd}, Title: {windowTitle})");
                
                // 查找 Tab/EdgeTab
                var tabCondition = new OrCondition(
                    new PropertyCondition(AutomationElement.ClassNameProperty, "EdgeTab"),
                    new PropertyCondition(AutomationElement.ClassNameProperty, "Tab")
                );
                var tabs = mainWindow.FindAll(TreeScope.Descendants, tabCondition);
                Console.WriteLine($"    找到 Tab/EdgeTab 元素: {tabs.Count} 个");
                
                if (tabs.Count > 0)
                {
                    var firstTab = tabs[0];
                    Console.WriteLine("    [Debug] Inspecting first tab children:");
                    var children = firstTab.FindAll(TreeScope.Descendants, Condition.TrueCondition);
                    foreach (AutomationElement child in children)
                    {
                        try 
                        {
                            var name = child.GetCurrentPropertyValue(AutomationElement.NameProperty) as string;
                            var type = (ControlType)child.GetCurrentPropertyValue(AutomationElement.ControlTypeProperty);
                            Console.WriteLine($"      - Type: {type.ProgrammaticName}, Name: '{name}'");
                        }
                        catch {}
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  错误: {ex.Message}");
            }
        }
        
        return 0;
    }

    static int ActivateTab(int index)
    {
        var tabs = _cachedTabs ?? GetAllTabs();
        
        if (index < 0 || index >= tabs.Count)
        {
            Console.Error.WriteLine($"Error: 索引 {index} 超出范围 (0-{tabs.Count - 1})");
            return 1;
        }

        var tab = tabs[index];
        ActivateBrowserTab(tab);
        Console.WriteLine("ok");
        return 0;
    }

    static int CloseTab(int index)
    {
        var tabs = _cachedTabs ?? GetAllTabs();
        
        if (index < 0 || index >= tabs.Count)
        {
            Console.Error.WriteLine($"Error: 索引 {index} 超出范围 (0-{tabs.Count - 1})");
            return 1;
        }

        var tab = tabs[index];
        CloseBrowserTab(tab);
        Console.WriteLine("ok");
        return 0;
    }

    static int OpenBookmarkManager(string browserName)
    {
        string processName = "";
        
        switch (browserName.ToLower())
        {
            case "chrome":
                processName = "chrome";
                break;
            case "edge":
            case "msedge":
                processName = "msedge";
                break;
            case "brave":
                processName = "brave";
                break;
            default:
                Console.Error.WriteLine($"Error: 不支持的浏览器 {browserName}");
                return 1;
        }

        try
        {
            // 1. 尝试找到已经打开的浏览器窗口
            Console.WriteLine($"[Debug] searching for {processName} windows...");
            var browserWindows = GetAllBrowserWindows();
            foreach (var window in browserWindows)
            {
                var p = Process.GetProcessById(window.processId);
                Console.WriteLine($"[Debug] checking window pid={p.Id} name={p.ProcessName}");
                
                if (p.ProcessName.Equals(processName, StringComparison.OrdinalIgnoreCase))
                {
                    Console.WriteLine("[Debug] match found, attempting to focus...");
                    
                    // 2. 激活窗口
                    if (IsWindowMinimized(window.hwnd))
                    {
                        Console.WriteLine("[Debug] restoring minimized window");
                        NativeMethods.ShowWindow(window.hwnd, NativeMethods.SW_RESTORE);
                    }
                    
                    // 尝试多种方式置顶
                    NativeMethods.SetForegroundWindow(window.hwnd);
                    
                    try 
                    {
                        var element = AutomationElement.FromHandle(window.hwnd);
                        element.SetFocus();
                    }
                    catch { /* ignore UIA focus error */ }

                    // 3. 发送快捷键 Ctrl+Shift+O
                    Console.WriteLine("[Debug] waiting 300ms...");
                    System.Threading.Thread.Sleep(300);
                    
                    Console.WriteLine("[Debug] sending keys ^+o");
                    System.Windows.Forms.SendKeys.SendWait("^+o");
                    
                    Console.WriteLine("ok");
                    return 0;
                }
            }

            // 4. 如果没找到窗口，回退到 Process.Start
            Console.WriteLine("[Debug] no existing window found, launching new process");
            string url = processName == "msedge" ? "edge://favorites" : 
                        (processName == "brave" ? "brave://bookmarks" : "chrome://bookmarks");
            
            Process.Start(new ProcessStartInfo(processName, url) { UseShellExecute = true });
            Console.WriteLine("ok");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Error opening manager: {ex.Message}");
            return 1;
        }
    }

    #region UI Automation 实现

    /// <summary>
    /// 获取所有浏览器标签页
    /// </summary>
    static List<BrowserTab> GetAllTabs()
    {
        var allTabs = new List<BrowserTab>();

        try
        {
            var browserWindows = GetAllBrowserWindows();

            foreach (var window in browserWindows)
            {
                try
                {
                    var process = Process.GetProcessById(window.processId);
                    var mainWindow = AutomationElement.FromHandle(window.hwnd);
                    if (mainWindow is null) continue;

                    // 获取窗口标题
                    var sb = new StringBuilder(256);
                    NativeMethods.GetWindowText(window.hwnd, sb, sb.Capacity);
                    string windowTitle = sb.ToString();

                    List<BrowserTab> tabs;
                    if (ChromiumProcessNames.Contains(process.ProcessName))
                    {
                        tabs = GetChromiumTabsFromWindow(mainWindow, process, window.hwnd, windowTitle);
                    }
                    else if (FirefoxProcessNames.Contains(process.ProcessName))
                    {
                        tabs = GetFirefoxTabsFromWindow(mainWindow, process, windowTitle);
                    }
                    else
                    {
                        continue;
                    }

                    allTabs.AddRange(tabs);
                }
                catch (Exception)
                {
                    // 进程可能已退出或窗口句柄无效，继续处理下一个
                }
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Error getting tabs: {ex}");
        }

        return allTabs;
    }

    /// <summary>
    /// 获取 Chromium 浏览器的标签页
    /// </summary>
    static List<BrowserTab> GetChromiumTabsFromWindow(AutomationElement mainWindow, Process process, IntPtr hwnd, string windowTitle)
    {
        var tabs = new List<BrowserTab>();
        try
        {
            // Chrome/Edge 标签页的 ClassName
            var tabCondition = new OrCondition(
                new PropertyCondition(AutomationElement.ClassNameProperty, "EdgeTab"),
                new PropertyCondition(AutomationElement.ClassNameProperty, "Tab")
            );

            var tabElements = mainWindow.FindAll(TreeScope.Descendants, tabCondition);
            int index = 0;

            foreach (AutomationElement tabElement in tabElements)
            {
                var tab = CreateTabFromElement(tabElement, process, index++, hwnd, windowTitle);
                if (tab != null)
                {
                    tabs.Add(tab);
                }
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Error getting Chromium tabs: {ex.Message}");
        }

        return tabs;
    }

    /// <summary>
    /// 获取 Firefox 浏览器的标签页
    /// </summary>
    static List<BrowserTab> GetFirefoxTabsFromWindow(AutomationElement mainWindow, Process process, string windowTitle)
    {
        var tabs = new List<BrowserTab>();
        try
        {
            var tabElement = mainWindow.FindFirst(TreeScope.Descendants,
                new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.Tab));

            if (tabElement == null) return tabs;

            var tabItems = tabElement.FindAll(TreeScope.Children,
                new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.TabItem));

            int index = 0;
            foreach (AutomationElement tabItem in tabItems)
            {
                var tab = CreateTabFromElement(tabItem, process, index++, IntPtr.Zero, windowTitle);
                if (tab != null)
                {
                    tabs.Add(tab);
                }
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Error getting Firefox tabs: {ex.Message}");
        }

        return tabs;
    }

    /// <summary>
    /// 从 AutomationElement 创建标签页对象
    /// </summary>
    static BrowserTab? CreateTabFromElement(AutomationElement tabElement, Process process, int index, IntPtr hwnd, string windowTitle)
    {
        try
        {
            var name = tabElement.GetCurrentPropertyValue(AutomationElement.NameProperty) as string;
            if (string.IsNullOrEmpty(name) || name == "New Tab" || name.Contains("about:blank"))
                return null;

            // 解析分组信息
            var (cleanTitle, tabGroup) = ParseTabGroup(name);

            return new BrowserTab
            {
                Title = cleanTitle,
                TabGroup = tabGroup,
                WindowTitle = windowTitle,
                BrowserName = process.ProcessName,
                IsMinimized = hwnd != IntPtr.Zero && IsWindowMinimized(hwnd),
                AutomationElement = tabElement,
                Hwnd = hwnd
            };
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// 从标题中解析分组信息
    /// 格式: "标题 - Part of tab group 分组名" 或 "标题 - Part of unnamed Color tab group"
    /// </summary>
    static (string cleanTitle, string tabGroup) ParseTabGroup(string title)
    {
        // 匹配 "Part of tab group XXX" 或 "Part of unnamed XXX tab group"
        const string pattern1 = " - Part of tab group ";
        const string pattern2 = " - Part of unnamed ";
        
        int idx1 = title.IndexOf(pattern1, StringComparison.OrdinalIgnoreCase);
        if (idx1 >= 0)
        {
            var cleanTitle = title.Substring(0, idx1);
            var groupPart = title.Substring(idx1 + pattern1.Length);
            // 移除可能的后缀（如 " - Memory usage - XXX MB"）
            int suffixIdx = groupPart.IndexOf(" - ");
            var tabGroup = suffixIdx >= 0 ? groupPart.Substring(0, suffixIdx) : groupPart;
            // 移除零宽字符
            tabGroup = tabGroup.Replace("\u200B", "").Trim();
            return (cleanTitle.Trim(), tabGroup);
        }
        
        int idx2 = title.IndexOf(pattern2, StringComparison.OrdinalIgnoreCase);
        if (idx2 >= 0)
        {
            var cleanTitle = title.Substring(0, idx2);
            var groupPart = title.Substring(idx2 + pattern2.Length);
            // 格式: "Color tab group"，提取颜色值
            int tabGroupIdx = groupPart.IndexOf(" tab group", StringComparison.OrdinalIgnoreCase);
            var tabGroup = tabGroupIdx >= 0 ? groupPart.Substring(0, tabGroupIdx) : groupPart;
            // 移除可能的后缀
            int suffixIdx = tabGroup.IndexOf(" - ");
            tabGroup = suffixIdx >= 0 ? tabGroup.Substring(0, suffixIdx) : tabGroup;
            tabGroup = tabGroup.Replace("\u200B", "").Trim();
            return (cleanTitle.Trim(), $"[{tabGroup}]");  // 用方括号标记未命名分组
        }
        
        // 无分组
        return (title, "");
    }

    /// <summary>
    /// 获取所有浏览器窗口
    /// </summary>
    /// <summary>
    /// 获取所有浏览器窗口
    /// </summary>
    static List<(IntPtr hwnd, int processId)> GetAllBrowserWindows()
    {
        // 1. 预先获取所有相关浏览器的 PID，避免在 EnumWindows 循环中频繁调用 Process.GetProcessById
        var targetPids = new HashSet<int>();
        var targetProcesses = new Dictionary<int, Process>(); // 缓存 Process 对象供后续使用

        var processNames = ChromiumProcessNames.Concat(FirefoxProcessNames);
        foreach (var name in processNames)
        {
            foreach (var p in Process.GetProcessesByName(name))
            {
                targetPids.Add(p.Id);
                targetProcesses[p.Id] = p;
            }
        }

        var windowHandles = new List<(IntPtr hwnd, uint pid)>();

        NativeMethods.EnumWindows((hwnd, lParam) =>
        {
            NativeMethods.GetWindowThreadProcessId(hwnd, out uint pid);
            if (targetPids.Contains((int)pid))
            {
                windowHandles.Add((hwnd, pid));
            }
            return true;
        }, IntPtr.Zero);

        // Fix: Sort by HWND to ensure stable order regardless of Z-order/Focus
        windowHandles.Sort((a, b) => a.hwnd.ToInt64().CompareTo(b.hwnd.ToInt64()));

        var browserWindows = new List<(IntPtr, int)>();
        
        foreach (var window in windowHandles)
        {
            try
            {
                // 只检查是否有标题 (过滤掉不可见的辅助窗口)
                int length = NativeMethods.GetWindowTextLength(window.hwnd);
                if (length > 0)
                {
                    browserWindows.Add((window.hwnd, (int)window.pid));
                }
            }
            catch
            {
                // ignore
            }
        }

        return browserWindows;
    }

    /// <summary>
    /// 激活标签页
    /// </summary>
    static void ActivateBrowserTab(BrowserTab tab)
    {
        try
        {
            // 1. 如果窗口最小化，先还原
            if (tab.Hwnd != IntPtr.Zero && IsWindowMinimized(tab.Hwnd))
            {
                NativeMethods.ShowWindow(tab.Hwnd, NativeMethods.SW_RESTORE);
                System.Threading.Thread.Sleep(50); // 给一点时间还原
            }

            // 2. 尝试将窗口置于前台 (多次尝试)
            if (tab.Hwnd != IntPtr.Zero)
            {
                for (int i = 0; i < 3; i++)
                {
                    NativeMethods.SetForegroundWindow(tab.Hwnd);
                    if (NativeMethods.GetForegroundWindow() == tab.Hwnd) break;
                    System.Threading.Thread.Sleep(10 + i * 10);
                }
            }

            // 3. 激活标签页 (UIA)
            // 有时候焦点不在标签栏，可能需要先 Focus
            try 
            {
                tab.AutomationElement.SetFocus();
            } 
            catch { /* ignore */ }

            if (tab.AutomationElement.TryGetCurrentPattern(SelectionItemPattern.Pattern, out var pattern))
            {
                ((SelectionItemPattern)pattern).Select();
            }
            else if (tab.AutomationElement.TryGetCurrentPattern(InvokePattern.Pattern, out var invokePattern))
            {
                ((InvokePattern)invokePattern).Invoke();
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Error activating tab: {ex.Message}");
        }
    }

    /// <summary>
    /// 关闭标签页
    /// </summary>
    static void CloseBrowserTab(BrowserTab tab)
    {
        try
        {
            // 1. 尝试直接点击标签页内的“关闭”按钮 (后台关闭，不需激活窗口)
            var closeButtonCondition = new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.Button);
            var buttons = tab.AutomationElement.FindAll(TreeScope.Descendants, closeButtonCondition);
            
            foreach (AutomationElement button in buttons)
            {
                var name = button.GetCurrentPropertyValue(AutomationElement.NameProperty) as string;
                // 常见关闭按钮名称 (英文/中文)
                // Chrome/Edge 通常是 "Close tab" 或 "关闭标签页"
                if (!string.IsNullOrEmpty(name) && 
                    (name.Contains("Close", StringComparison.OrdinalIgnoreCase) || 
                     name.Contains("关闭", StringComparison.OrdinalIgnoreCase)))
                {
                    if (button.TryGetCurrentPattern(InvokePattern.Pattern, out var invokePattern))
                    {
                        ((InvokePattern)invokePattern).Invoke();
                        return; // 成功后台关闭
                    }
                }
            }
            
            // 尝试找 LegacyIAccessiblePattern (某些旧版或特殊浏览器)
            // ... (省略，暂不复杂化)

            // 如果后台关闭失败...
            // 用户希望能保持 Raycast 打开，但是 SendKeys 必须要有焦点。
            // 这是一个权衡：为了关闭成功，必须抢焦点；为了不抢焦点，就只能后台关闭。
            // 既然到了这里说明后台关闭失效，我们只能尝试激活窗口来关闭，否则用户会觉得“没反应”。
            // 或者我们可以尝试不 SetForegroundWindow 直接 SendKeys? 不行，SendKeys 发送到活动窗口。
            
            // 2. 如果找不到关闭按钮，回退到：激活 -> Ctrl+W
            // 注意：这会导致 Raycast 失去焦点从而自动隐藏 (Raycast 默认行为)
            // 先激活标签页
            if (tab.AutomationElement.TryGetCurrentPattern(SelectionItemPattern.Pattern, out var pattern))
            {
                ((SelectionItemPattern)pattern).Select();
            }

            // 使用 Ctrl+W 关闭标签页
            // 需要确保窗口在前台
            if (tab.Hwnd != IntPtr.Zero)
            {
                 NativeMethods.SetForegroundWindow(tab.Hwnd);
            }

            System.Threading.Thread.Sleep(100);
            System.Windows.Forms.SendKeys.SendWait("^w");
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Error closing tab: {ex.Message}");
        }
    }

    /// <summary>
    /// 检查窗口是否最小化
    /// </summary>
    static bool IsWindowMinimized(IntPtr hwnd)
    {
        var placement = new NativeMethods.WINDOWPLACEMENT();
        placement.length = Marshal.SizeOf(typeof(NativeMethods.WINDOWPLACEMENT));
        if (NativeMethods.GetWindowPlacement(hwnd, ref placement))
            return placement.showCmd == NativeMethods.SW_SHOWMINIMIZED;
        return false;
    }

    #endregion
}

/// <summary>
/// 标签页数据
/// </summary>
class BrowserTab
{
    public string Title { get; init; } = "";
    public string TabGroup { get; init; } = "";
    public string WindowTitle { get; init; } = "";
    public string BrowserName { get; init; } = "";
    public bool IsMinimized { get; init; }
    public AutomationElement AutomationElement { get; init; } = null!;
    public IntPtr Hwnd { get; init; }
}

/// <summary>
/// JSON 输出用的标签页信息
/// </summary>
record TabInfo
{
    public int Index { get; init; }
    public string Title { get; init; } = "";
    public string TabGroup { get; init; } = "";
    public string WindowTitle { get; init; } = "";
    public string Browser { get; init; } = "";
    public bool IsMinimized { get; init; }
}

record BookmarkInfo
{
    public string Title { get; init; } = "";
    public string Url { get; init; } = "";
    public string Folder { get; init; } = "";
    public string Browser { get; init; } = "";
}

/// <summary>
/// Windows API 调用
/// </summary>
static class NativeMethods
{
    public const int SW_SHOWMINIMIZED = 2;
    public const int SW_RESTORE = 9;

    public delegate bool EnumWindowsProc(IntPtr hwnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern int GetWindowTextLength(IntPtr hWnd);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern bool GetWindowPlacement(IntPtr hWnd, ref WINDOWPLACEMENT lpwndpl);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [StructLayout(LayoutKind.Sequential)]
    public struct WINDOWPLACEMENT
    {
        public int length;
        public int flags;
        public int showCmd;
        public System.Drawing.Point ptMinPosition;
        public System.Drawing.Point ptMaxPosition;
        public System.Drawing.Rectangle rcNormalPosition;
    }
}
