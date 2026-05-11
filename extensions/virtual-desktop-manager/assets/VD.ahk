#Requires AutoHotkey v2.1-alpha.5

class VD {
    class Array {
        static find(arr, callback) {
            for v in arr {
                if (callback(v)) {
                    return v
                }
            }
            return VD.Null
        }
        static flatMap(iterator, callback) {
            arr := []
            if (callback.IsVariadic || callback.MaxParams > 1) {
                idx := 1
                for v in iterator {
                    arr.Push(callback(v, idx)*)
                    ++idx
                }
            } else if (callback.MaxParams == 1) {
                for v in iterator {
                    arr.Push(callback(v)*)
                }
            } else {
                throw "Invalid Callback With MaxParams == 0"
            }
            return arr
        }
    }

    static Null := {}

    static versions := [
        {
            buildNumber: 20348,
            revisionNumber: 0,
            IID_IVirtualDesktopManagerInternal_str: "{f31574d6-b682-4cdc-bd56-1827860abec6}",
            IID_IVirtualDesktop_str: "{ff72ffdd-be7e-43fc-9c03-ad81681e88e4}",
            IID_IVirtualDesktopNotification_str: "{c179334c-4295-40d3-bea1-c654d965605a}",
            ; vtbl
            IVirtualDesktopManagerInternal: VD.IVirtualDesktopManagerInternal_Normal,
            idx_MoveViewToDesktop:4,
            idx_GetCurrentDesktop:6,
            idx_GetDesktops:7,
            idx_SwitchDesktop:9,
            idx_CreateDesktop:10,
            idx_RemoveDesktop:11,
            idx_FindDesktop:12,
            ; get/set
            idx_GetName:-1,
            idx_SetDesktopName:-1,
            idx_GetWallpaper:-1,
            idx_SetDesktopWallpaper:-1,
            ;vtbl Notification
            IVirtualDesktopNotification: VD.IVirtualDesktopNotification_Normal,
            IVirtualDesktopNotification_methods_count: 9,
            idx_VirtualDesktopCreated:3,
            idx_VirtualDesktopDestroyed:6,
            idx_CurrentVirtualDesktopChanged:8,
        },
        {
            buildNumber: 22000,
            revisionNumber: 0,
            IID_IVirtualDesktopManagerInternal_str: "{094afe11-44f2-4ba0-976f-29a97e263ee0}",
            IID_IVirtualDesktop_str: "{62fdf88b-11ca-4afb-8bd8-2296dfae49e2}",
            IID_IVirtualDesktopNotification_str: "{f3163e11-6b04-433c-a64b-6f82c9094257}",
            ; vtbl
            IVirtualDesktopManagerInternal: VD.IVirtualDesktopManagerInternal_HMONITOR,
            idx_MoveViewToDesktop:4,
            idx_GetCurrentDesktop:6,
            idx_GetDesktops:7,
            idx_SwitchDesktop:9,
            idx_CreateDesktop:10,
            idx_RemoveDesktop:11,
            idx_FindDesktop:12,
            ; get/set
            idx_GetName:6,
            idx_SetDesktopName:14,
            idx_GetWallpaper:-1,
            idx_SetDesktopWallpaper:-1,
            ;vtbl Notification
            IVirtualDesktopNotification: VD.IVirtualDesktopNotification_Normal,
            IVirtualDesktopNotification_methods_count: 11,
            idx_VirtualDesktopCreated:3,
            idx_VirtualDesktopDestroyed:6,
            idx_CurrentVirtualDesktopChanged:10,
        },
        {
            buildNumber: 22483,
            revisionNumber: 0,
            IID_IVirtualDesktopManagerInternal_str: "{b2f925b9-5a0f-4d2e-9f4d-2b1507593c10}",
            IID_IVirtualDesktop_str: "{536d3495-b208-4cc9-ae26-de8111275bf8}",
            IID_IVirtualDesktopNotification_str: "{cd403e52-deed-4c13-b437-b98380f2b1e8}",
            ; vtbl
            IVirtualDesktopManagerInternal: VD.IVirtualDesktopManagerInternal_HMONITOR,
            idx_MoveViewToDesktop:4,
            idx_GetCurrentDesktop:6,
            idx_GetDesktops:7,
            idx_SwitchDesktop:9,
            idx_CreateDesktop:10,
            idx_RemoveDesktop:12,
            idx_FindDesktop:13,
            ; get/set
            idx_GetName:6,
            idx_SetDesktopName:15,
            idx_GetWallpaper:7,
            idx_SetDesktopWallpaper:16,
            ;vtbl Notification
            IVirtualDesktopNotification: VD.IVirtualDesktopNotification_IObjectArray,
            IVirtualDesktopNotification_methods_count: 13,
            idx_VirtualDesktopCreated:3,
            idx_VirtualDesktopDestroyed:6,
            idx_CurrentVirtualDesktopChanged:11,
        },
        {
            buildNumber: 22621,
            revisionNumber: 2215,
            IID_IVirtualDesktopManagerInternal_str: "{b2f925b9-5a0f-4d2e-9f4d-2b1507593c10}",
            IID_IVirtualDesktop_str: "{536d3495-b208-4cc9-ae26-de8111275bf8}",
            IID_IVirtualDesktopNotification_str: "{cd403e52-deed-4c13-b437-b98380f2b1e8}",
            ; vtbl
            IVirtualDesktopManagerInternal: VD.IVirtualDesktopManagerInternal_HMONITOR,
            idx_MoveViewToDesktop:4,
            idx_GetCurrentDesktop:6,
            idx_GetDesktops:8,
            idx_SwitchDesktop:10,
            idx_CreateDesktop:11,
            idx_RemoveDesktop:13,
            idx_FindDesktop:14,
            ; get/set
            idx_GetName:6,
            idx_SetDesktopName:16,
            idx_GetWallpaper:7,
            idx_SetDesktopWallpaper:17,
            ;vtbl Notification
            IVirtualDesktopNotification: VD.IVirtualDesktopNotification_IObjectArray,
            IVirtualDesktopNotification_methods_count: 13,
            idx_VirtualDesktopCreated:3,
            idx_VirtualDesktopDestroyed:6,
            idx_CurrentVirtualDesktopChanged:11,
        },
        {
            buildNumber: 22631,
            revisionNumber: 3085,
            IID_IVirtualDesktopManagerInternal_str: "{a3175f2d-239c-4bd2-8aa0-eeba8b0b138e}",
            IID_IVirtualDesktop_str: "{3f07f4be-b107-441a-af0f-39d82529072c}",
            IID_IVirtualDesktopNotification_str: "{b287fa1c-7771-471a-a2df-9b6b21f0d675}",
            ; vtbl
            IVirtualDesktopManagerInternal: VD.IVirtualDesktopManagerInternal_Normal,
            idx_MoveViewToDesktop:4,
            idx_GetCurrentDesktop:6,
            idx_GetDesktops:7,
            idx_SwitchDesktop:9,
            idx_CreateDesktop:10,
            idx_RemoveDesktop:12,
            idx_FindDesktop:13,
            ; get/set
            idx_GetName:5,
            idx_SetDesktopName:15,
            idx_GetWallpaper:6,
            idx_SetDesktopWallpaper:16,
            ;vtbl Notification
            IVirtualDesktopNotification: VD.IVirtualDesktopNotification_Normal,
            IVirtualDesktopNotification_methods_count: 14,
            idx_VirtualDesktopCreated:3,
            idx_VirtualDesktopDestroyed:6,
            idx_CurrentVirtualDesktopChanged:10,
        },
        {
            buildNumber: 26100,
            revisionNumber: 0,
            IID_IVirtualDesktopManagerInternal_str: "{53f5ca0b-158f-4124-900c-057158060b27}",
            IID_IVirtualDesktop_str: "{3f07f4be-b107-441a-af0f-39d82529072c}",
            IID_IVirtualDesktopNotification_str: "{b9e5e94d-233e-49ab-af5c-2b4541c3aade}",
            ; vtbl
            IVirtualDesktopManagerInternal: VD.IVirtualDesktopManagerInternal_Normal,
            idx_MoveViewToDesktop:4,
            idx_GetCurrentDesktop:6,
            idx_GetDesktops:7,
            idx_SwitchDesktop:9,
            idx_CreateDesktop:10,
            idx_RemoveDesktop:12,
            idx_FindDesktop:13,
            ; get/set
            idx_GetName:5,
            idx_SetDesktopName:15,
            idx_GetWallpaper:6,
            idx_SetDesktopWallpaper:16,
            ;vtbl Notification
            IVirtualDesktopNotification: VD.IVirtualDesktopNotification_Normal,
            IVirtualDesktopNotification_methods_count: 14,
            idx_VirtualDesktopCreated:3,
            idx_VirtualDesktopDestroyed:6,
            idx_CurrentVirtualDesktopChanged:10,
        },
        {
            buildNumber: 99999,
            revisionNumber: 0,
            IID_IVirtualDesktopManagerInternal_str: "{53f5ca0b-158f-4124-900c-057158060b27}",
            IID_IVirtualDesktop_str: "{3f07f4be-b107-441a-af0f-39d82529072c}",
            IID_IVirtualDesktopNotification_str: "{b9e5e94d-233e-49ab-af5c-2b4541c3aade}",
            ; vtbl
            IVirtualDesktopManagerInternal: VD.IVirtualDesktopManagerInternal_Normal,
            idx_MoveViewToDesktop:4,
            idx_GetCurrentDesktop:6,
            idx_GetDesktops:7,
            idx_SwitchDesktop:9,
            idx_CreateDesktop:11,
            idx_RemoveDesktop:13,
            idx_FindDesktop:14,
            ; get/set
            idx_GetName:5,
            idx_SetDesktopName:16,
            idx_GetWallpaper:6,
            idx_SetDesktopWallpaper:17,
            ;vtbl Notification
            IVirtualDesktopNotification: VD.IVirtualDesktopNotification_Normal,
            IVirtualDesktopNotification_methods_count: 14,
            idx_VirtualDesktopCreated:3,
            idx_VirtualDesktopDestroyed:6,
            idx_CurrentVirtualDesktopChanged:10,
        },
    ] ; default: version: 99999 ; (just a big number like Infinity)

    static __New() {
        OS_Version := FileGetVersion(A_WinDir "\System32\twinui.pcshell.dll")
        splitByDot:=StrSplit(OS_Version, ".")
        buildNumber:=Integer(splitByDot[3])
        revisionNumber:=Integer(splitByDot[4])
        VD.version := VD.Array.find(VD.versions,
            version => (buildNumber < version.buildNumber || (buildNumber == version.buildNumber && revisionNumber < version.revisionNumber))
        )
        DllCall("ole32\CLSIDFromString", "WStr", VD.version.IID_IVirtualDesktop_str, "Ptr", VD.version.IID_IVirtualDesktop_ptr := Buffer(0x10))

        VD.ret := Buffer(1, 0xc3)
        DllCall("VirtualProtect", "Ptr", VD.ret, "Ptr", 1, "Uint", 0x40, "Uint*", &lpflOldProtect:=0) ;0x40=PAGE_EXECUTE_READWRITE ;WRITE is needed because it changes more than 1 byte

        VD.ListenersCurrentVirtualDesktopChanged := Map()
        VD.WinActivate_callback := 0

        VD.DesktopIdMap := Map()

        VD.IApplicationViewCollection := VD.IApplicationViewCollection_Class()
        VD.IVirtualPinnedAppsHandler := VD.IVirtualPinnedAppsHandler_Class()
        VD.IVirtualDesktopNotificationService := VD.IVirtualDesktopNotificationService_Class()
        VD.IVirtualDesktopNotification := VD.version.IVirtualDesktopNotification()
        VD.IVirtualDesktopManagerInternal := VD.version.IVirtualDesktopManagerInternal()

        (VD.LocalizedWord_TaskView) ; "Task View"

        OnMessage(DllCall("RegisterWindowMessageW","WStr","TaskbarCreated","Uint"), (*) => (VD.reinit(), ""))
        VD.reinit()
        if (VD.waiting) { ; block / poll because it may be immediately used, ex: VD.createUntil(3)
            loop 50 { ; 10 seconds
                Sleep 200
                if (!VD.waiting) {
                    break
                }
            }
        }
    }

    static reinit() {
        try {
            CImmersiveShell_IServiceProvider := ComObject("{c2f03a33-21f5-47fa-b4bb-156362a2f239}", "{6d5140c1-7436-11ce-8034-00aa006009fa}")
            VD.IApplicationViewCollection.reinit(CImmersiveShell_IServiceProvider)
            VD.IVirtualPinnedAppsHandler.reinit(CImmersiveShell_IServiceProvider)
            VD.IVirtualDesktopNotificationService.reinit(CImmersiveShell_IServiceProvider)
            VD.IVirtualDesktopNotificationService.Register(VD.IVirtualDesktopNotification)
            VD.IVirtualDesktopManagerInternal.reinit(CImmersiveShell_IServiceProvider)

            VD.IVirtualDesktopListChanged()
            VD.currentDesktopNum := VD.IVirtualDesktopMap[VD.IVirtualDesktopManagerInternal.GetCurrentDesktop()]
            VD.waiting := false
            return
        }
        VD.waiting := true
    }

    static IVirtualDesktopListChanged() {
        VD.IVirtualDesktopList := [VD.IObjectArray(VD.IVirtualDesktopManagerInternal.GetDesktops(), VD.version.IID_IVirtualDesktop_ptr)*]
        VD.IVirtualDesktopMap := Map(VD.Array.flatMap(VD.IVirtualDesktopList, (IVirtualDesktop, i) => [IVirtualDesktop, i])*)
    }

    class IApplicationViewCollection_Class {
        reinit(CImmersiveShell_IServiceProvider) {
            this.IApplicationViewCollection := ComObjQuery(CImmersiveShell_IServiceProvider, "{1841c6d7-4f9d-42c0-af41-8747538f10e5}", "{1841c6d7-4f9d-42c0-af41-8747538f10e5}")
        }
        GetViewForHwnd(HWND) {
            hr := ComCall(6, this.IApplicationViewCollection, "Ptr", HWND, "Ptr*", &IApplicationView := 0, "Uint")
            return IApplicationView
        }
    }

    static WinActivatePriority := {
        NewWindow: "new window",
        OldWindowExcludeDesktop: "old window - Exclude Desktop",
        OldWindowIncludeDesktop: "old window - Include Desktop",
    }

    static ModulusResolveDesktopNum(desktopNum) {
        desktopNum := Mod(desktopNum, VD.IVirtualDesktopList.Length)
        if (desktopNum <= 0) {
            desktopNum := desktopNum + VD.IVirtualDesktopList.Length
        }
        return desktopNum
    }

    static goToRelativeDesktopNum(relative_count) {
        absolute_desktopNum := VD.modulusResolveDesktopNum(VD.currentDesktopNum + relative_count)
        return VD.goToDesktopNum(absolute_desktopNum)
    }

    static MoveWindowToRelativeDesktopNum(wintitle, relative_count, follow := false, WinActivatePriority := VD.WinActivatePriority.NewWindow) {
        absolute_desktopNum := VD.modulusResolveDesktopNum(VD.currentDesktopNum + relative_count)
        return VD.MoveWindowToDesktopNum(wintitle, absolute_desktopNum, follow, WinActivatePriority)
    }

    static MoveWindowToCurrentDesktop(wintitle, activateYourWindow := true) {
        return VD.MoveWindowToDesktopNum(wintitle, VD.currentDesktopNum, activateYourWindow)
    }

    static TryWinGetID(wintitle) {
        loop 3 {
            hwnd := VD.FindFirstWindowInAllDesktops(wintitle)
            if (hwnd) {
                break
            }
            Sleep 10
        }
        return hwnd
    }

    static MoveWindowToDesktopNum(wintitle, desktopNum, follow := false, WinActivatePriority := VD.WinActivatePriority.NewWindow) {
        loop 1 {
            hwnd := VD.TryWinGetID(wintitle)
            if (!hwnd) {
                desktopNum := -1
                break
            }
            IApplicationView := VD.IApplicationViewCollection.GetViewForHwnd(hwnd)
            if (!IApplicationView) {
                desktopNum := -1
                break
            }
            window_desktopNum := VD.getDesktopNumOfHWND(hwnd)
            activeWindow := WinGetID("A")
            if (window_desktopNum !== desktopNum) {
                VD.IVirtualDesktopManagerInternal.MoveViewToDesktop(IApplicationView, VD.IVirtualDesktopList[desktopNum])
                if (!follow && activeWindow == hwnd) {
                    VD.WinActivateFirstWindowInCurrentDesktop(50)
                    Sleep 100 ; don't want to switch the changing foreground window
                }
            }
            if (follow) {
                if (desktopNum == VD.currentDesktopNum) {
                    VD.SetForegroundWindow(hwnd)
                } else {
                    VD.RegisterWinActivateUponSwitch(hwnd)
                    if (activeWindow !== hwnd) {
                        VD.AllowSetForegroundWindowAny()
                    }
                    VD.IVirtualDesktopManagerInternal.SwitchDesktop(VD.IVirtualDesktopList[desktopNum])
                }
            }
        }
        return desktopNum
    }

    static getDesktopNumOfHWND(hwnd) {
        IApplicationView := VD.IApplicationViewCollection.GetViewForHwnd(hwnd)
        if (!IApplicationView) {
            return 0
        }
        DesktopId := VD.IApplicationView_Class(IApplicationView).GetVirtualDesktopId()
        DesktopId_GUID_str := VD._StringFromGUID(DesktopId)
        switch DesktopId_GUID_str {
            ; https://github.com/MScholtes/VirtualDesktop/blob/a725cbd3cdb9e977678eeaf034a7cc96d2e74bc6/VirtualDesktop11.cs#L329
            ; https://github.com/MScholtes/VirtualDesktop/commit/614c7176a384116afcacac4650d445d7a31f645d
            ; CVirtualDesktopVisibilityPolicy::PinViewToAllDesktops(struct IApplicationView * __ptr64,bool) __ptr64
            ; bool:true -> "{BB64D5B7-4DE3-4AB2-A87C-DB7601AEA7DC}" ; AppOnAllDesktops
            ; bool:false -> "{C2DDEA68-66F2-4CF9-8264-1BFD00FBBBAC}" ; WindowOnAllDesktops
            case "{BB64D5B7-4DE3-4AB2-A87C-DB7601AEA7DC}": return -1 ; PinAppID
            case "{C2DDEA68-66F2-4CF9-8264-1BFD00FBBBAC}": return -2 ; PinView (unless IsAppIdPinned is set)
            default:
                if (VD.DesktopIdMap.Has(DesktopId_GUID_str)) { ;cache
                    IVirtualDesktop_found := VD.DesktopIdMap[DesktopId_GUID_str]
                } else {
                    IVirtualDesktop_found := VD.IVirtualDesktopManagerInternal.FindDesktop(DesktopId)
                    if (!IVirtualDesktop_found) {
                        throw Error("Desktop not found: " DesktopId_GUID_str)
                    }
                    VD.DesktopIdMap[DesktopId_GUID_str] := IVirtualDesktop_found
                }
                return VD.IVirtualDesktopMap[IVirtualDesktop_found]
        }
    }

    static getDesktopNumOfWindow(wintitle) {
        hwnd := WinGetID(wintitle)
        return VD.getDesktopNumOfHWND(hwnd)
    }

    static FindFirstWindowInAllDesktops(wintitle) {
        bak_A_DetectHiddenWindows := A_DetectHiddenWindows
        A_DetectHiddenWindows := true
        hwnd_list := WinGetList(wintitle)
        A_DetectHiddenWindows := bak_A_DetectHiddenWindows
        found := VD._FindValidWindow(hwnd_list)
        return found
    }

    static goToDesktopOfWindow(wintitle, activateYourWindow := true) {
        hwnd := VD.FindFirstWindowInAllDesktops(wintitle)
        if (!hwnd) {
            VD._UnblockVDFunctionRunning()
            throw Error("Window not found: " wintitle)
        }
        desktopNum := VD.getDesktopNumOfHWND(hwnd)
        if (desktopNum == VD.currentDesktopNum) {
            if (activateYourWindow) {
                VD.SetForegroundWindow(hwnd)
            }
        } else {
            if (activateYourWindow) {
                VD.RegisterWinActivateUponSwitch(hwnd)
            }
            VD.AllowSetForegroundWindowAny()
            VD.IVirtualDesktopManagerInternal.SwitchDesktop(VD.IVirtualDesktopList[desktopNum])
        }
        return desktopNum
    }

    static SetForegroundWindow(hWnd, waitCompletionDelay := 0) {
        if (DllCall("AllowSetForegroundWindow", "Uint", DllCall("GetCurrentProcessId"))) {
            DllCall("SetForegroundWindow", "Ptr", hwnd)
        } else {
            LCtrlDown := GetKeyState("LCtrl")
            RCtrlDown := GetKeyState("RCtrl")
            LShiftDown := GetKeyState("LShift")
            RShiftDown := GetKeyState("RShift")
            LWinDown := GetKeyState("LWin")
            RWinDown := GetKeyState("RWin")
            LAltDown := GetKeyState("LAlt")
            RAltDown := GetKeyState("RAlt")
            if ((LCtrlDown || RCtrlDown) && (LWinDown || RWinDown)) {
                toRelease := ""
                if (LShiftDown) {
                    toRelease .= "{LShift Up}"
                }
                if (RShiftDown) {
                    toRelease .= "{RShift Up}"
                }
                if (toRelease) {
                    Send "{Blind}" toRelease
                }
            }
            BlockInput "On"
            Send "{LAlt Down}{LAlt Down}"
            DllCall("SetForegroundWindow", "Ptr", hwnd)
            toAppend := ""
            if (!LAltDown) {
                toAppend .= "{LAlt Up}"
            }
            if (RAltDown) {
                toAppend .= "{RAlt Down}"
            }
            if (LCtrlDown) {
                toAppend .= "{LCtrl Down}"
            }
            if (RCtrlDown) {
                toAppend .= "{RCtrl Down}"
            }
            if (LShiftDown) {
                toAppend .= "{LShift Down}"
            }
            if (RShiftDown) {
                toAppend .= "{RShift Down}"
            }
            if (LWinDown) {
                toAppend .= "{LWin Down}"
            }
            if (RWinDown) {
                toAppend .= "{RWin Down}"
            }
            if (toAppend) {
                Send "{Blind}" toAppend
            }
            BlockInput "Off"
        }
        if (waitCompletionDelay) {
            end := A_TickCount + waitCompletionDelay
            while (A_TickCount < end) {
                if (DllCall("GetForegroundWindow", "Ptr") == hWnd) {
                    break
                }
            }
        }
    }

    static AllowSetForegroundWindowAny() {
        VD_animation_gui := Gui("-Border -SysMenu +Owner -Caption")
        this.SetForegroundWindow(VD_animation_gui.Hwnd)
        DllCall("AllowSetForegroundWindow", "Uint", 0xFFFFFFFF) ;ASFW_ANY
    }

    static FindFirstWindowInCurrentDesktop() {
        bak_A_DetectHiddenWindows := A_DetectHiddenWindows
        A_DetectHiddenWindows := false
        hwnd_list := WinGetList()
        A_DetectHiddenWindows := bak_A_DetectHiddenWindows
        found := VD._FindValidWindow(hwnd_list, true)
        return found
    }

    static WinActivateFirstWindowInCurrentDesktop(waitCompletionDelay := 0) {
        hwnd := VD.FindFirstWindowInCurrentDesktop()
        if (!hwnd) {
            VD.SetForegroundWindow(WinGetID("ahk_class Progman ahk_exe explorer.exe")) ; Desktop
        } else {
            VD.SetForegroundWindow(hwnd, waitCompletionDelay)
        }
    }

    static ShouldActivateUponArrival() {
        if (WinActive(VD.LocalizedWord_TaskView " ahk_exe explorer.exe")) {
            return false
        }
        return true
    }

    static RegisterWinActivateUponSwitch(hwnd) {
        VD.WinActivate_callback := callback := () {
            VD.WinActivate_callback := 0
            if (hwnd == 0) {
                VD.WinActivateFirstWindowInCurrentDesktop()
            } else {
                if (VD._isMinimizedWindow(hwnd)) {
                    DllCall("ShowWindow", "Ptr", hwnd, "Uint", 9) ;SW_RESTORE
                }
                VD.SetForegroundWindow(hwnd)
            }
        }
        SetTimer () {
            if (VD.WinActivate_callback == callback) {
                VD.WinActivate_callback := 0
            }
        }, -1000
    }

    static _FindValidWindow(hwnd_list, isNotMinized := false) {
        already_hwnd := Map()
        _innerFindValidWindow(hwnd) {
            loop 1 {
                if (already_hwnd.Has(hwnd)) {
                    found := already_hwnd[hwnd]
                    break
                }
                owner := DllCall("GetWindow", "Ptr", hwnd, "Uint", 4)
                if (owner) {
                    found := _innerFindValidWindow(owner)
                    break
                }
                dwStyle := DllCall("GetWindowLongPtrW", "Ptr", hWnd, "Int", -16, "Ptr")
                if (!(dwStyle & 0x10000000)) { ;WS_VISIBLE
                    found := false
                    break
                }
                if (isNotMinized && (dwStyle & 0x20000000)) { ; WS_MINIMIZE
                    found := false
                    break
                }
                dwExStyle := DllCall("GetWindowLongPtrW", "Ptr", hWnd, "Int", -20, "Ptr")
                if (dwExStyle & 0x00040000) { ;WS_EX_APPWINDOW
                    found := hwnd
                    break
                }
                if (dwExStyle & 0x08000080) { ; WS_EX_NOACTIVATE | WS_EX_TOOLWINDOW
                    found := false
                    break
                }
                found := hwnd
            }
            already_hwnd[hwnd] := found
            return found
        }
        found := false
        for (hwnd in hwnd_list) {
            if ((found := _innerFindValidWindow(hwnd))) {
                break
            }
        }
        return found
    }

    static _isMinimizedWindow(hWnd) {
        dwStyle := DllCall("GetWindowLongPtrW", "Ptr", hWnd, "Int", -16, "Ptr")
        if (dwStyle & 0x20000000) { ; WS_MINIMIZE
            return true
        }
        return false
    }

    static WaitDesktopSwitched(desktopNum, waitMiliseconds := 1000, additionalWaitMiliseconds := 100) {
        if (desktopNum <= 0) {
            return
        }
        loop 1 {
            end := A_TickCount + waitMiliseconds
            while (A_TickCount < end) {
                Critical
                if (VD.currentDesktopNum == desktopNum) {
                    Critical "Off"
                    Sleep additionalWaitMiliseconds ; additional sleep
                    return true
                }
                Critical "Off"
                Sleep -1
            }
            Sleep additionalWaitMiliseconds ; additional sleep, just in case
            return false
        }
    }

    static goToDesktopNum(desktopNum) {
        if (desktopNum == VD.currentDesktopNum) {
            if (VD.ShouldActivateUponArrival()) {
                VD.WinActivateFirstWindowInCurrentDesktop()
            }
        } else {
            if (VD.ShouldActivateUponArrival()) {
                VD.RegisterWinActivateUponSwitch(0)
                VD.AllowSetForegroundWindowAny()
            }
            VD.IVirtualDesktopManagerInternal.SwitchDesktop(VD.IVirtualDesktopList[desktopNum])
        }
        return desktopNum
    }

    static getCurrentDesktopNum() {
        return VD.currentDesktopNum
    }
    static getCount() {
        return VD.IVirtualDesktopList.Length
    }

    static createDesktop(goThere := false) {
        IVirtualDesktop_ofNewDesktop := VD.IVirtualDesktopManagerInternal.CreateDesktop()
        if (goThere) {
            VD.IVirtualDesktopManagerInternal.SwitchDesktop(IVirtualDesktop_ofNewDesktop)
        }
    }
    static createUntil(howMany, goToLastlyCreated := false) {
        howManyThereAlreadyAre := VD.IVirtualDesktopList.Length
        if (howManyThereAlreadyAre >= howMany) { ; ensure at least 1 was created for goToLastlyCreated:true
            return
        }
        loop (howMany - howManyThereAlreadyAre) {
            IVirtualDesktop_ofNewDesktop := VD.IVirtualDesktopManagerInternal.CreateDesktop()
        }
        if (goToLastlyCreated) {
            VD.IVirtualDesktopManagerInternal.SwitchDesktop(IVirtualDesktop_ofNewDesktop)
        }
    }
    static removeDesktop(desktopNum := VD.currentDesktopNum, fallback_desktopNum := -1) {
        if (VD.IVirtualDesktopList.Length == 1) {
            return ;can't delete last
        }
        if (desktopNum == VD.currentDesktopNum) {
            if (fallback_desktopNum == -1) { ; provide default, do not verify fallback_desktopNum if provided
                fallback_desktopNum := VD.modulusResolveDesktopNum(VD.currentDesktopNum - 1)
            }
        } else { ; there's really no need for a fallback if it's not the current
            fallback_desktopNum := VD.currentDesktopNum
        }
        VD.IVirtualDesktopManagerInternal.RemoveDesktop(VD.IVirtualDesktopList[desktopNum], VD.IVirtualDesktopList[fallback_desktopNum])
    }

    static IsWindowPinned(wintitle) {
        hwnd := WinGetID(wintitle)
        IApplicationView := VD.IApplicationViewCollection.GetViewForHwnd(hwnd)
        viewIsPinned := VD.IVirtualPinnedAppsHandler.IsViewPinned(IApplicationView)
        return viewIsPinned
    }
    static PinWindow(wintitle) {
        hwnd := WinGetID(wintitle)
        IApplicationView := VD.IApplicationViewCollection.GetViewForHwnd(hwnd)
        VD.IVirtualPinnedAppsHandler.PinView(IApplicationView)
    }
    static UnPinWindow(wintitle) {
        hwnd := WinGetID(wintitle)
        IApplicationView := VD.IApplicationViewCollection.GetViewForHwnd(hwnd)
        VD.IVirtualPinnedAppsHandler.UnpinView(IApplicationView)
    }
    static TogglePinWindow(wintitle) {
        hwnd := WinGetID(wintitle)
        IApplicationView := VD.IApplicationViewCollection.GetViewForHwnd(hwnd)
        viewIsPinned := VD.IVirtualPinnedAppsHandler.IsViewPinned(IApplicationView)
        if (viewIsPinned) {
            VD.IVirtualPinnedAppsHandler.UnpinView(IApplicationView)
        } else {
            VD.IVirtualPinnedAppsHandler.PinView(IApplicationView)
        }
    }

    static IsExePinned(exe_path) {
        appIsPinned := VD.IVirtualPinnedAppsHandler.IsAppIdPinned(exe_path)
        return appIsPinned
    }
    static PinExe(exe_path) {
        VD.IVirtualPinnedAppsHandler.PinAppID(exe_path)
    }
    static UnPinExe(exe_path) {
        VD.IVirtualPinnedAppsHandler.UnpinAppID(exe_path)
    }
    static TogglePinExe(exe_path) {
        appIsPinned := VD.IVirtualPinnedAppsHandler.IsAppIdPinned(exe_path)
        if (appIsPinned) {
            VD.IVirtualPinnedAppsHandler.UnpinAppID(exe_path)
        } else {
            VD.IVirtualPinnedAppsHandler.PinAppID(exe_path)
        }
    }

    static IsAppPinned(wintitle) {
        return VD.IsExePinned(WinGetProcessPath(wintitle))
    }
    static PinApp(wintitle) {
        VD.PinExe(WinGetProcessPath(wintitle))
    }
    static UnPinApp(wintitle) {
        VD.UnPinExe(WinGetProcessPath(wintitle))
    }
    static TogglePinApp(wintitle) {
        VD.TogglePinExe(WinGetProcessPath(wintitle))
    }

    class IVirtualPinnedAppsHandler_Class {
        reinit(CImmersiveShell_IServiceProvider) {
            this.IVirtualDesktopPinnedApps := ComObjQuery(CImmersiveShell_IServiceProvider, "{b5a399e7-1c87-46b8-88e9-fc5747b171bd}", "{4ce81583-1e4c-4632-a621-07a53543148f}")
        }
        IsAppIdPinned(exe_path) {
            ComCall(3, this.IVirtualDesktopPinnedApps, "WStr", exe_path, "Int*", &appIsPinned := 0)
            return appIsPinned
        }
        PinAppID(exe_path) {
            ComCall(4, this.IVirtualDesktopPinnedApps, "WStr", exe_path)
        }
        UnpinAppID(exe_path) {
            ComCall(5, this.IVirtualDesktopPinnedApps, "WStr", exe_path)
        }
        IsViewPinned(IApplicationView) {
            ComCall(6, this.IVirtualDesktopPinnedApps, "Ptr", IApplicationView, "Int*", &viewIsPinned := 0)
            return viewIsPinned
        }
        PinView(IApplicationView) {
            ComCall(7, this.IVirtualDesktopPinnedApps, "Ptr", IApplicationView)
        }
        UnpinView(IApplicationView) {
            ComCall(8, this.IVirtualDesktopPinnedApps, "Ptr", IApplicationView)
        }
    }

    static LocalizedWord_TaskView => VD._LocalizedWord_TaskView ??= VD._get_LocalizedWord_TaskView()
    static _LocalizedWord_TaskView := unset
    static _get_LocalizedWord_TaskView() {
        hModule := DllCall("LoadLibraryExW", "WStr", "twinui.pcshell.dll", "Ptr", 0, "Uint", 0x00000022, "Ptr") ;LOAD_LIBRARY_AS_DATAFILE | LOAD_LIBRARY_AS_IMAGE_RESOURCE
        chars := 128
        lpBuffer := Buffer(chars << 1)
        length := DllCall("LoadStringW", "Uint", hModule, "Uint", 1512, "Ptr", lpBuffer, "Int", chars)
        _LocalizedWord_TaskView := StrGet(lpBuffer, length, "UTF-16")
        DllCall("FreeLibrary", "Ptr", hModule)
        return _LocalizedWord_TaskView
    }

    static LocalizedWord_Desktop => VD._LocalizedWord_Desktop ??= VD._get_LocalizedWord_Desktop()
    static _LocalizedWord_Desktop := unset
    static _get_LocalizedWord_Desktop() {
        hModule := DllCall("LoadLibraryExW", "WStr", "shell32.dll", "Ptr", 0, "Uint", 0x00000022, "Ptr") ;LOAD_LIBRARY_AS_DATAFILE | LOAD_LIBRARY_AS_IMAGE_RESOURCE
        chars := 128
        lpBuffer := Buffer(chars << 1)
        length := DllCall("LoadStringW", "Uint", hModule, "Uint", 21769, "Ptr", lpBuffer, "Int", chars)
        _LocalizedWord_Desktop := StrGet(lpBuffer, length, "UTF-16")
        DllCall("FreeLibrary", "Ptr", hModule)
        return _LocalizedWord_Desktop
    }

    static getNameFromDesktopNum(desktopNum) {
        desktopName := ""
        if (VD.version.idx_GetName > -1) {
            IVirtualDesktop := VD.IVirtualDesktopList[desktopNum]
            desktopName := VD.IVirtualDesktop_Class(IVirtualDesktop, VD.version).GetName()
        }
        if (!desktopName) {
            desktopName := VD.LocalizedWord_Desktop " " desktopNum
        }
        return desktopName
    }

    static getWallpaperFromDesktopNum(desktopNum) {
        wallpaperPath := ""
        if (VD.version.idx_GetWallpaper > -1) {
            IVirtualDesktop := VD.IVirtualDesktopList[desktopNum]
            wallpaperPath := VD.IVirtualDesktop_Class(IVirtualDesktop, VD.version).GetWallpaper()
        }
        return wallpaperPath
    }

    static setNameToDesktopNum(desktopNum, desktopName) {
        if (VD.version.idx_SetDesktopName > -1) {
            IVirtualDesktop := VD.IVirtualDesktopList[desktopNum]
            VD.IVirtualDesktopManagerInternal.SetDesktopName(IVirtualDesktop, desktopName)
        }
    }

    static setWallpaperToDesktopNum(desktopNum, wallpaperPath) {
        if (VD.version.idx_SetDesktopWallpaper > -1) {
            IVirtualDesktop := VD.IVirtualDesktopList[desktopNum]
            VD.IVirtualDesktopManagerInternal.SetDesktopWallpaper(IVirtualDesktop, wallpaperPath)
        }
    }

    class IVirtualDesktop_Class {
        __New(IVirtualDesktop, version) {
            this.version := version
            this.IVirtualDesktop := IVirtualDesktop
        }
        GetName() {
            ComCall(this.version.idx_GetName, this.IVirtualDesktop, "Ptr*", &HSTRING := 0)
            desktopName := StrGet(DllCall("combase\WindowsGetStringRawBuffer", "Ptr", HSTRING, "Uint*", &length := 0, "Ptr"), "UTF-16")
            DllCall("combase\WindowsDeleteString", "Ptr", HSTRING)
            return desktopName
        }
        GetWallpaper() {
            ComCall(this.version.idx_GetWallpaper, this.IVirtualDesktop, "Ptr*", &HSTRING := 0)
            wallpaperPath := StrGet(DllCall("combase\WindowsGetStringRawBuffer", "Ptr", HSTRING, "Uint*", &length := 0, "Ptr"), "UTF-16")
            DllCall("combase\WindowsDeleteString", "Ptr", HSTRING)
            return wallpaperPath
        }
    }

    class IApplicationView_Class {
        __New(IApplicationView) {
            this.IApplicationView := IApplicationView
        }
        GetVirtualDesktopId() {
            ComCall(25, this.IApplicationView, "Ptr", DesktopId := Buffer(16)) ; GUID
            return DesktopId
        }
    }

    class IVirtualDesktopManagerInternal_Normal {
        __New(version) {
            this.version := version
        }
        reinit(CImmersiveShell_IServiceProvider) {
            this.IVirtualDesktopManagerInternal := ComObjQuery(CImmersiveShell_IServiceProvider, "{c5e0cdca-7b6e-41b2-9fc4-d93975cc467b}", this.version.IID_IVirtualDesktopManagerInternal_str)
        }
        ; interface
        MoveViewToDesktop(IApplicationView, IVirtualDesktop) {
            ComCall(this.version.idx_MoveViewToDesktop, this.IVirtualDesktopManagerInternal, "Ptr", IApplicationView, "Ptr", IVirtualDesktop)
        }
        GetCurrentDesktop() {
            ComCall(this.version.idx_GetCurrentDesktop, this.IVirtualDesktopManagerInternal, "Ptr*", &IVirtualDesktop_current := 0)
            return IVirtualDesktop_current
        }
        GetDesktops() {
            ComCall(this.version.idx_GetDesktops, this.IVirtualDesktopManagerInternal, "Ptr*", &IObjectArray := 0)
            return IObjectArray
        }
        SwitchDesktop(IVirtualDesktop) {
            ComCall(this.version.idx_SwitchDesktop, this.IVirtualDesktopManagerInternal, "Ptr", IVirtualDesktop)
        }
        CreateDesktop() {
            ComCall(this.version.idx_CreateDesktop, this.IVirtualDesktopManagerInternal, "Ptr*", &IVirtualDesktop_created := 0)
            return IVirtualDesktop_created
        }
        RemoveDesktop(IVirtualDesktop, IVirtualDesktop_fallback) {
            ComCall(this.version.idx_RemoveDesktop, this.IVirtualDesktopManagerInternal, "Ptr", IVirtualDesktop, "Ptr", IVirtualDesktop_fallback)
        }
        FindDesktop(DesktopId) {
            ComCall(this.version.idx_FindDesktop, this.IVirtualDesktopManagerInternal, "Ptr", DesktopId, "Ptr*", &IVirtualDesktop_found := 0)
            return IVirtualDesktop_found
        }
        SetDesktopName(IVirtualDesktop, desktopName) {
            DllCall("combase\WindowsCreateString", "WStr", desktopName, "Uint", StrLen(desktopName), "Ptr*", &HSTRING := 0)
            ComCall(this.version.idx_SetDesktopName, this.IVirtualDesktopManagerInternal, "Ptr", IVirtualDesktop, "Ptr", HSTRING)
            DllCall("combase\WindowsDeleteString", "Ptr", HSTRING)
        }
        SetDesktopWallpaper(IVirtualDesktop, wallpaperPath) {
            DllCall("combase\WindowsCreateString", "WStr", wallpaperPath, "Uint", StrLen(wallpaperPath), "Ptr*", &HSTRING := 0)
            ComCall(this.version.idx_SetDesktopWallpaper, this.IVirtualDesktopManagerInternal, "Ptr", IVirtualDesktop, "Ptr", HSTRING)
            DllCall("combase\WindowsDeleteString", "Ptr", HSTRING)
        }
    }

    class IVirtualDesktopManagerInternal_HMONITOR extends VD.IVirtualDesktopManagerInternal_Normal {
        ; just set HMONITOR to 0 ?
        GetCurrentDesktop() {
            ComCall(this.version.idx_GetCurrentDesktop, this.IVirtualDesktopManagerInternal, "Ptr", 0, "Ptr*", &IVirtualDesktop_current := 0)
            return IVirtualDesktop_current
        }
        GetDesktops() {
            ComCall(this.version.idx_GetDesktops, this.IVirtualDesktopManagerInternal, "Ptr", 0, "Ptr*", &IObjectArray := 0)
            return IObjectArray
        }
        SwitchDesktop(IVirtualDesktop) {
            ComCall(this.version.idx_SwitchDesktop, this.IVirtualDesktopManagerInternal, "Ptr", 0, "Ptr", IVirtualDesktop)
        }
        CreateDesktop() {
            ComCall(this.version.idx_CreateDesktop, this.IVirtualDesktopManagerInternal, "Ptr", 0, "Ptr*", &IVirtualDesktop_created := 0)
            return IVirtualDesktop_created
        }
    }

    class IObjectArray {
        __New(IObjectArray, IID_Interface_ptr) {
            this.IObjectArray := IObjectArray
            this.IID_Interface_ptr := IID_Interface_ptr
        }
        Length => _length ??= this.GetCount()
        _length := unset
        GetCount() {
            ComCall(3, this.IObjectArray, "Uint*", &Count := 0)
            return Count
        }
        GetAt(oneBasedIndex) {
            ComCall(4, this.IObjectArray, "UInt", oneBasedIndex - 1, "Ptr", this.IID_Interface_ptr, "Ptr*", &IInterface:=0)
            return IInterface
        }
        __Item[idx] => this.GetAt(idx)
        __Enum(NumberOfVars) {
            switch NumberOfVars {
                case 1: return VD.Enumerator1(this)
                case 2: return VD.Enumerator2(this)
                default: throw "Invalid number of variables"
            }
        }
    }

    class Enumerator1 {
        __New(arr) {
            this.arr := arr
            this.idx := 1
        }
        Call(&OutputVar1) {
            if (this.idx <= this.arr.Length) {
                OutputVar1 := this.arr[this.idx]
                ++this.idx
                return 1
            }
            return 0
        }
    }

    class Enumerator2 {
        __New(arr) {
            this.arr := arr
            this.idx := 1
        }
        Call(&OutputVar1, &OutputVar2) {
            if (this.idx <= this.arr.Length) {
                OutputVar1 := this.idx
                OutputVar2 := this.arr[this.idx]
                ++this.idx
                return 1
            }
            return 0
        }
    }

    class IVirtualDesktopNotificationService_Class {
        reinit(CImmersiveShell_IServiceProvider) {
            this.IVirtualDesktopNotificationService := ComObjQuery(CImmersiveShell_IServiceProvider, "{a501fdec-4a09-464c-ae4e-1b9c21b84918}", "{0cd45e71-d927-4f15-8b0a-8fef525337bf}")
        }
        Register(IVirtualDesktopNotification) {
            ComCall(3,this.IVirtualDesktopNotificationService,"Ptr",IVirtualDesktopNotification,"Uint*",pdwCookie:=0) ;3=Register
        }
    }

    class IVirtualDesktopNotification_Normal {
        __New(version) {
            this.version := version
            ; obj and vtbl in the same buffer, obj only contain vtbl_pointer
            this.obj_and_vtbl := Buffer(A_PtrSize*(version.IVirtualDesktopNotification_methods_count+1))
            this.vtbl := this.obj_and_vtbl.Ptr + A_PtrSize
            NumPut("Ptr", this.vtbl, this.obj_and_vtbl)
            offset := 0
            loop version.IVirtualDesktopNotification_methods_count {
                NumPut("Ptr", VD.ret.Ptr, this.vtbl, offset)
                offset += A_PtrSize
            }

            ; QueryInterface only called during IVirtualDesktopNotificationService::Register, thread-safe (hopefully)
            NumPut("Ptr", VD.BoundCallbackCreate(CallbackCreate, this.QueryInterface, this), this.vtbl)

            ; PostMessage
            CallbackCreate_PostMessage := VD.CallbackCreate_PostMessage.Bind(VD)
            NumPut("Ptr", VD.BoundCallbackCreate(CallbackCreate_PostMessage, this.VirtualDesktopCreated, this), this.vtbl, version.idx_VirtualDesktopCreated*A_PtrSize)
            NumPut("Ptr", VD.BoundCallbackCreate(CallbackCreate_PostMessage, this.VirtualDesktopDestroyed, this), this.vtbl, version.idx_VirtualDesktopDestroyed*A_PtrSize)
            NumPut("Ptr", VD.BoundCallbackCreate(CallbackCreate_PostMessage, this.CurrentVirtualDesktopChanged, this), this.vtbl, version.idx_CurrentVirtualDesktopChanged*A_PtrSize)
        }

        Ptr => this.obj_and_vtbl.Ptr

        QueryInterface(that, riid, ppvObject) {
            if (!ppvObject) {
                return 0x80070057 ;E_INVALIDARG
            }

            switch VD._StringFromGUID(riid), 0 { ;not case-sensitive
                case "{00000000-0000-0000-c000-000000000046}", this.version.IID_IVirtualDesktopNotification_str:
                    NumPut("Ptr", that, ppvObject) ; *ppvObject = this;
                    return 0 ;S_OK
                default:
                    NumPut("Ptr", 0, ppvObject) ; *ppvObject = NULL;
                    return 0x80004002 ;E_NOINTERFACE
            }
        }

        VirtualDesktopCreated() {
            VD.IVirtualDesktopListChanged()
        }
        VirtualDesktopDestroyed() {
            VD.IVirtualDesktopListChanged() ; called after CurrentVirtualDesktopChanged
        }
        _common_CurrentVirtualDesktopChanged(IVirtualDesktop_old, IVirtualDesktop_new) {
            desktopNum_old := VD.IVirtualDesktopMap[IVirtualDesktop_old]
            VD.currentDesktopNum := VD.IVirtualDesktopMap[IVirtualDesktop_new]
            if (VD.WinActivate_callback) {
                VD.WinActivate_callback.Call()
            }
            for k, _ in VD.ListenersCurrentVirtualDesktopChanged {
                k(desktopNum_old, VD.currentDesktopNum)
            }
        }
        CurrentVirtualDesktopChanged(that, IVirtualDesktop_old, IVirtualDesktop_new) {
            this._common_CurrentVirtualDesktopChanged(IVirtualDesktop_old, IVirtualDesktop_new)
        }
    }
    class IVirtualDesktopNotification_IObjectArray extends VD.IVirtualDesktopNotification_Normal {
        CurrentVirtualDesktopChanged(that, IObjectArray, IVirtualDesktop_old, IVirtualDesktop_new) {
            this._common_CurrentVirtualDesktopChanged(IVirtualDesktop_old, IVirtualDesktop_new)
        }
    }
    static BoundCallbackCreate(func_CallbackCreate, callback, that) {
        return func_CallbackCreate(callback.Bind(that),, callback.MinParams - 1)
    }

    static _StringFromGUID(guid) {
        DllCall("ole32\StringFromGUID2", "Ptr", guid, "ptr", buf := Buffer(78), "Int", 39)
        return StrGet(buf, "UTF-16")
    }

    static CallbackCreate_PostMessage(callback, Options := "", ParamCount := callback.MinParams) {
        ; CallbackCreate for Multithreading (by) using the message queue
        ;idea from:
        ;Lexikos : RegisterSyncCallback (for multi-threaded APIs) : https://www.autohotkey.com/boards/viewtopic.php?t=21223
        ;https://github.com/thqby/ahk2_lib/blob/master/OVERLAPPED.ahk
        static PostMessageW := DllCall('GetProcAddress', 'ptr', DllCall('GetModuleHandle', 'str', 'user32', 'ptr'), 'astr', 'PostMessageW', 'ptr')
        static GlobalAlloc := DllCall('GetProcAddress', 'ptr', DllCall('GetModuleHandle', 'str', 'kernel32', 'ptr'), 'astr', 'GlobalAlloc', 'ptr')
        static AHK_CallbackCreate_PostMessage := DllCall('RegisterWindowMessageW', 'WStr', 'AHK_CallbackCreate_PostMessage', 'uint')
        static asm := init()
        static init() {
            OnMessage(AHK_CallbackCreate_PostMessage, A_PtrSize == 8 ? VD.CallbackCreate_PostMessage_event_x86_64.Bind(VD) : VD.CallbackCreate_PostMessage_event_x86.Bind(VD))
            if (A_PtrSize == 8) {
                asm := Buffer(0x81)
                ; params := []
                ; params.Push(
                NumPut(
                ; 55 | push rbp
                ; 48 89 e5 | mov rbp, rsp
                'uint', 0xe5894855,

                ; save to shadow space ; https://github.com/simon-whitehead/assembly-fun/blob/master/windows-x64/README.md#shadow-space
                ; 48 89 4c 24 10 | mov [rsp + 0x10], rcx
                'uchar', 0x48, 'uint', 0x10244c89,
                ; 48 89 54 24 18 | mov [rsp + 0x18], rdx
                'uchar', 0x48, 'uint', 0x18245489,
                ; 4c 89 44 24 20 | mov [rsp + 0x20], r8
                'uchar', 0x4c, 'uint', 0x20244489,
                ; 4c 89 4c 24 28 | mov [rsp + 0x28], r9
                'uchar', 0x4c, 'uint', 0x28244c89,

                ; 48 83 ec 40 | sub rsp, 0x40
                'uint', 0x40ec8348,

                ; The x64 ABI considers registers RBX, RBP, RDI, RSI, RSP, R12, R13, R14, R15, and XMM6-XMM15 nonvolatile.
                ; https://learn.microsoft.com/en-us/cpp/build/x64-calling-convention?view=msvc-170
                ; save RSI, RDI, R12, R13
                ; 48 89 74 24 20 | mov [rsp + 0x20], rsi
                'uchar', 0x48, 'uint', 0x20247489,
                ; 48 89 7c 24 28 | mov [rsp + 0x28], rdi
                'uchar', 0x48, 'uint', 0x28247c89,
                ; 4c 89 64 24 30 | mov [rsp + 0x30], r12
                'uchar', 0x4c, 'uint', 0x30246489,
                ; 4c 89 6c 24 38 | mov [rsp + 0x38], r13
                'uchar', 0x4c, 'uint', 0x38246c89,

                ; The x64 ABI considers the registers RAX, RCX, RDX, R8, R9, R10, R11, and XMM0-XMM5 volatile.
                ; R10: ParamCount
                ; R11: obj
                ; 4d 89 d4 | mov r12, r10
                'uchar', 0x4d, 'ushort', 0xd489,
                ; 4d 89 dd | mov r13, r11
                'uchar', 0x4d, 'ushort', 0xdd89,

                ; 31 c9 | xor ecx, ecx
                'ushort', 0xc931,
                ; 4c 89 e2 | mov rdx, r12
                'uchar', 0x4c, 'ushort', 0xe289,
                ; 48 c1 e2 03 | shl rdx, 3
                'uint', 0x03e2c148,
                ; 48 b8 XX XX XX XX XX XX XX XX | mov rax, GlobalAlloc
                'ushort', 0xb848, "ptr", GlobalAlloc,
                ; ff d0 | call rax
                ; GlobalAlloc(GMEM_FIXED, A_PtrSize * ParamCount)
                'ushort', 0xd0ff,

                ; 48 8d 74 24 50 | lea rsi, [rsp + 0x50]
                'uchar', 0x48, 'uint', 0x5024748d,
                ; 48 89 c7 | mov rdi, rax
                ; no error handling, assumes GlobalAlloc succeeded
                'uchar', 0x48, 'ushort', 0xc789,
                ; 4c 89 e1 | mov rcx, r12
                'uchar', 0x4c, 'ushort', 0xe189,
                ; could be memcpy
                ; f3 48 a5 | rep movsq
                'uchar', 0xf3, 'ushort', 0xa548,

                ; 49 89 c1 | mov r9, rax
                'uchar', 0x49, 'ushort', 0xc189,
                ; 4d 89 e8 | mov r8, r13
                'uchar', 0x4d, 'ushort', 0xe889,
                ; ba XX XX XX XX | mov edx, AHK_CallbackCreate_PostMessage
                'uchar', 0xba, 'uint', AHK_CallbackCreate_PostMessage,
                ; b9 XX XX XX XX | mov ecx, A_ScriptHwnd ; assume handles are 32-bit
                'uchar', 0xb9, 'uint', A_ScriptHwnd,
                ; 48 b8 XX XX XX XX XX XX XX XX | mov rax, PostMessageW
                'ushort', 0xb848, "ptr", PostMessageW,
                ; ff d0 | call rax
                ; PostMessageW(A_ScriptHwnd, AHK_CallbackCreate_PostMessage, obj, saved_params)
                'ushort', 0xd0ff,

                ; 48 83 c4 20 | add rsp, 0x20
                'uint', 0x20c48348,
                ; 5e | pop rsi
                'uchar', 0x5e,
                ; 5f | pop rdi
                'uchar', 0x5f,
                ; 41 5c | pop r12
                'ushort', 0x5c41,
                ; 41 5d | pop r13
                'ushort', 0x5d41,
                ; 5d | pop rbp
                'uchar', 0x5d,
                ; c3 | ret
                'uchar', 0xc3,
                asm
                )

                ; i:=1,sum:=0,end:=params.Length & ~1
                ; sizeMap:=Map()
                ; sizeMap.CaseSense:=false
                ; sizeMap.Set('uchar',1,"ushort",2,"uint",4,"ptr",A_PtrSize)
                ; while (i <= end) {
                ;     sum+=sizeMap[params[i]]
                ;     i+=2
                ; }
            } else {
                throw Error("not implemented")
            }
            DllCall("VirtualProtect", "Ptr", asm, "Ptr", asm.Size, "Uint", 0x40, "Uint*", &lpflOldProtect:=0) ;0x40=PAGE_EXECUTE_READWRITE ;WRITE is needed because it changes more than 1 byte
            return asm
        }

        params:=[]
        obj := {callback: callback, ParamCount: ParamCount}

        if (A_PtrSize == 8) {
            stub := Buffer(0x15)
            ; R10: ParamCount
            ; R11: obj
            NumPut(
            ; 41 ba XX XX XX XX  | mov r10d, ParamCount
            "ushort", 0xba41, "uint", ParamCount,
            ; 49 bb XX XX XX XX XX XX XX XX | mov r11, obj
            "ushort", 0xbb49, "ptr", ObjPtr(obj),
            ; e9 XX XX XX XX | jmp asm ; assumes no further than 0x7FFFFFFF
            "uchar", 0xe9, "int", asm.Ptr - (stub.Ptr + stub.Size),
            stub
            )
        } else {
            throw Error("not implemented")
        }
        DllCall("VirtualProtect", "Ptr", stub, "Ptr", stub.Size, "Uint", 0x40, "Uint*", &lpflOldProtect:=0) ;0x40=PAGE_EXECUTE_READWRITE ;WRITE is needed because it changes more than 1 byte

        if (!VD.CallbackFree_PostMessage.HasOwnProp("CallBacks")) {
            VD.CallbackFree_PostMessage.CallBacks := Map()
        }
        VD.CallbackFree_PostMessage.CallBacks[stub.Ptr] := [stub, obj]

        return stub.Ptr
    }

    static CallbackCreate_PostMessage_event_x86_64(wParam, lParam, msg, hwnd) {
        Critical

        obj := ObjFromPtrAddRef(wParam)

        params:=[],i:=lParam,end:=i + (obj.ParamCount * A_PtrSize)
        while (i < end) {
            params.Push(NumGet(i,"Ptr")),i+=A_PtrSize
        }
        DllCall("GlobalFree","Ptr",lParam)
        obj.callback.Call(params*)
    }
    static CallbackCreate_PostMessage_event_x86(wParam, lParam, msg, hwnd) {
        Critical

        throw Error("not implemented")
    }

    static CallbackFree_PostMessage(Address) {
        if (VD.CallbackFree_PostMessage.HasOwnProp("CallBacks")) {
            VD.CallbackFree_PostMessage.CallBacks.Delete(Address)
        }
    }

}