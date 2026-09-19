# Process Monitor Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Search running apps by name, PID, or port and quit them
- Helpers and child processes are grouped under their app, so quitting an app quits the whole group, with combined CPU and memory per app
- Quits are verified against a fresh process snapshot, so a recycled PID is never killed by mistake
- System processes protected by SIP are shown greyed out and cannot be quit
- Enter quits the selected app directly, without a confirmation dialog
- On-demand resource sampling: two-frame network throughput via nettop runs only in the Network category, keeping other views instantaneous
- Menu bar extras draw iStat-style CPU and memory graphs and refresh every 10 seconds. The Memory extra is a narrow memory-pressure pill and its menu shows pressure, App / Wired / Compressed / Available, paging, swap, and top RAM apps; the CPU extra is a user/system histogram whose menu shows overall CPU, P/E cores, and top CPU apps. Quit sits in a submenu
- 菜单栏开关：CPU / 内存两颗胶囊各有设置项，默认开启，关掉只隐藏图标
- 界面、菜单栏和设置项均为简体中文
- 状态栏 CPU 为蓝/粉堆叠竖胶囊，内存为更窄的压力胶囊；压力未知时不画柱。CPU 面板命令与菜单栏里的「打开面板」跳转已移除
