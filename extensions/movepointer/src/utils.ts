import { LocalStorage, closeMainWindow, showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export interface Point {
  x: number;
  y: number;
}
export async function getStorageValue(name: string) {
  const item = await LocalStorage.getItem<string>(name);
  console.log(item);
  return item;
}

export async function getAllValue() {
  const items = await LocalStorage.allItems();
  return items;
}

export async function allStorageClear() {
  await closeMainWindow();
  await LocalStorage.clear();
  showHUD("ポインター設定を消去しました");
}

export function movePointer(point: Point) {
  return `
    use scripting additions
    use framework "Foundation"

    tell current application to CGWarpMouseCursorPosition({${point}})
  `;
}

export function currentPointer() {
  return `
    use scripting additions
    use framework "Foundation"

    set {x, y} to my mousePosition()
    on mousePosition()
      --use scripting additions
      --use framework "Foundation"
      --global desktopHeight, hoseiX, hoseiY
      set mouseLocate to current application's class "NSEvent"'s mouseLocation() --|現在のマウス位置を記録|
      try --|デスクトップの高さの変数desktopHeightに数値が設定されていなければ、再設定をする |
        desktopHeight as integer
      on error
        set desktopHeight to (word 4 of (do shell script "/usr/sbin/system_profiler SPDisplaysDataType | grep Resolution | tail -n 1")) as integer
      end try
      try --|マウス位置の数値上のズレを記録した変数が設定されていなければ、再設定する|
        {hoseiX as integer, hoseiY as integer}
      on error
        (* ポインタを測定原点位置に移動してから、位置を測定しズレを確認。補正変数に記録します *)
        set pt to {x:100, y:100}
        tell current application to CGPostMouseEvent(pt, 1, 1, 0)
        set mouseLoc to current application's class "NSEvent"'s mouseLocation()
        set x1 to (x of mouseLoc) as integer
        set y1 to desktopHeight - ((y of mouseLoc) as integer)
        set pt to {x:x1, y:y1}
        tell current application to CGPostMouseEvent(pt, 1, 1, 0)
        set mouseLoc to current application's class "NSEvent"'s mouseLocation()
        set x2 to (x of mouseLoc) as integer
        set y2 to desktopHeight - ((y of mouseLoc) as integer)
        set {hoseiX, hoseiY} to {(x2 - x1), (y2 - y1)}
      end try
      (* マウスポインターの位置を補正を反映して元の位置に戻します *)
      set mouseX to ((x of mouseLocate) as integer) - hoseiX
      set mouseY to desktopHeight - ((y of mouseLocate) as integer) - hoseiY
      set pt to {x:mouseX, y:mouseY}
      -- tell current application to CGPostMouseEvent(pt, 1, 1, 0)
      tell current application to CGWarpMouseCursorPosition(pt)
      return {mouseX, mouseY}
    end mousePosition
  `;
}

export async function runAppleScriptSilently(appleScript: string) {
  await closeMainWindow();
  return await runAppleScript(appleScript);
}
