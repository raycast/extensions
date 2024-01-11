import { Clipboard, getPreferenceValues, getSelectedText, environment } from "@raycast/api";
import { exec as Exec } from "child_process";
import { promisify } from "util";

const Layout = [
  "@#$^&`~qwertyuiop[]QWERTYUIOP{}asdfghjkl;'ASDFGHJKL:\"|zxcvbnm,./ZXCVBNM<>?",
  '"№;:?ёЁйцукенгшщзхъЙЦУКЕНГШЩЗХЪфывапролджэФЫВАПРОЛДЖЭ/ячсмитьбю.ЯЧСМИТЬБЮ,',
];

const { layoutEN, layoutRU } = getPreferenceValues();
const regex = /[А-Яа-яЁё]/m;

const exec = promisify(Exec);

export default async function main() {
  let inStr = "";
  let layoutDirect = 0;
  const outArr: Array<string> = [];

  try {
    inStr = await getSelectedText();
  } catch (error) {
    console.log("Unable to get selected text");
  }

  if (inStr !== "") {
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
