import { Clipboard, getPreferenceValues, getSelectedText, environment } from "@raycast/api";
import { exec } from "child_process";

const LayoutPC = [
  "@#$^&`~qwertyuiop[]QWERTYUIOP{}asdfghjkl;'ASDFGHJKL:\"|zxcvbnm,./ZXCVBNM<>?",
  '"№;:?ёЁйцукенгшщзхъЙЦУКЕНГШЩЗХЪфывапролджэФЫВАПРОЛДЖЭ/ячсмитьбю.ЯЧСМИТЬБЮ,',
];

const LayoutnPC = [
  "@#$^&`~qwertyuiop[]QWERTYUIOP{}asdfghjkl;'ASDFGHJKL:\"|zxcvbnm,./ZXCVBNM<>?%*\\",
  '"№%,.][йцукенгшщзхъЙЦУКЕНГШЩЗХЪфывапролджэФЫВАПРОЛДЖЭЁячсмитьбю.ЯЧСМИТЬБЮ,:;ё',
];

const { layoutEN, layoutRU } = getPreferenceValues();
const regex = /[А-Яа-яЁё]/m;

export default async function main() {
  let inStr = "";
  let layoutDirect = 0;
  let Layout = ["", ""];
  const outArr: Array<string> = [];

  try {
    inStr = await getSelectedText();
  } catch (error) {
    console.log("Unable to get selected text");
  }

  if (inStr !== "") {
    layoutRU == "Russian" ? (Layout = LayoutnPC) : (Layout = LayoutPC);
    inStr.split(" ").map((word) => {
      layoutDirect = Number(regex.test(word));
      outArr.push(
        word
          .split("")
          .map((ch) =>
            Layout[layoutDirect].indexOf(ch) != -1
              ? Layout[1 - layoutDirect].charAt(Layout[layoutDirect].indexOf(ch))
              : ch,
          )
          .join(""),
      );
    });

    if (layoutDirect) {
      switchLayout(layoutEN);
    } else {
      switchLayout(layoutRU);
    }
    await Clipboard.paste(outArr.join(" "));
  }
}

async function switchLayout(layout: string): Promise<void> {
  await exec(`/bin/chmod u+x ${environment.assetsPath}/keyboardSwitcher`);
  await exec(`${environment.assetsPath}/keyboardSwitcher select '${layout}'`);
}
