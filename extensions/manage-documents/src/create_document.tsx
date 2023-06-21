import { useEffect, useState } from "react";
import { environment, showToast, Action, ActionPanel, List } from "@raycast/api";
import { exec } from "child_process";
import fs from "fs";
import os from 'os';

const currentDate: Date = new Date();
const formattedDate: string = `${currentDate.getDate()}.${currentDate.getMonth() + 1}.${currentDate.getFullYear().toString().slice(-2)}`;
const formattedTime: string = `${currentDate.getHours().toString().padStart(2, '0')}-${currentDate.getMinutes().toString().padStart(2, '0')}`;
const currentUser = os.userInfo().username;
const basePath = `/Users/${currentUser}/Library/Mobile Documents/`

const Pages_Template_DST = `${basePath}com~apple~Pages/Documents/PagesDoc ${formattedTime} ${formattedDate}.pages`
const Keynote_Template_DST = `${basePath}com~apple~Keynote/Documents/KeynoteDoc ${formattedTime} ${formattedDate}.key`
const Textedit_Template_DST = `${basePath}com~apple~TextEdit/Documents/TextEditDoc ${formattedTime} ${formattedDate}.rtf`
const Scriptedit_Template_DST = `${basePath}com~apple~ScriptEditor2/Documents/ScriptEditDoc ${formattedTime} ${formattedDate}.scpt`
const Numbers_Template_DST = `${basePath}com~apple~Numbers/Documents/NumbersDoc ${formattedTime} ${formattedDate}.numbers`

const Pages_Template_SRC = `${environment.assetsPath}/PagesOhneTitel.pages`
const Keynote_Template_SRC = `${environment.assetsPath}/KeynoteOhneTitel.key`
const Textedit_Template_SRC = `${environment.assetsPath}/TextEditOhneTitel.rtf`
const Scriptedit_Template_SRC = `${environment.assetsPath}/ScriptEditOhneTItel.scpt`
const Numbers_Template_SRC = `${environment.assetsPath}/NumbersOhneTitel.numbers`

const items = [
  { keywords: ["numbers"], name: "Numbers", imgsrc: `${environment.assetsPath}/numbers_icon.png`, SRC: Numbers_Template_SRC, DST: Numbers_Template_DST},
  { keywords: ["keynote"], name: "Keynote", imgsrc: `${environment.assetsPath}/keynote_icon.png`, SRC: Keynote_Template_SRC, DST: Keynote_Template_DST},
  { keywords: ["pages"], name: "Pages", imgsrc: `${environment.assetsPath}/pages_icon.png`, SRC: Pages_Template_SRC, DST: Pages_Template_DST},
  { keywords: ["scriptedit", "script"], name: "ScriptEdit", imgsrc: `${environment.assetsPath}/scriptedit_icon.png`, SRC: Scriptedit_Template_SRC, DST: Scriptedit_Template_DST},
  { keywords: ["textedit", "txt"], name: "TextEdit", imgsrc:`${environment.assetsPath}/textedit_icon.png`, SRC: Textedit_Template_SRC, DST: Textedit_Template_DST},
];


export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [filteredList, filterList] = useState(items);

  useEffect(() => {
    filterList(items.filter((item) => item.keywords.some((keyword) => keyword.includes(searchText))));
  }, [searchText]);

  function terminalBefehlausführen(befehl: string) {
    exec(befehl, (error, stdout, stderr) => {
      if (error) {
        console.error(`Fehler beim Öffnen der Datei: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`Fehler beim Ausführen des Befehls: ${stderr}`);
        return;
      }
      console.log('Datei erfolgreich geöffnet.');
    });
  }

  function copyFile(source: string, destination: string) {
    fs.copyFile(source, destination, (error) => {
      if (error) {
        showToast({ title: "Error", message: error.message });
        return;
      }
      terminalBefehlausführen(`open "${destination}"`);
    });
  }

  const handleItemAction = (src: string, dst: string) => {
    copyFile(src, dst)
  };

  return (
    <List
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Dokument Typ"
      searchBarPlaceholder="Wähle deinen Dokument Typ"
    >
      {filteredList.map((item) => (
        <List.Item 
            key={item.name}
            title={item.name}
            icon={item.imgsrc}
            actions={
                <ActionPanel>
                  <Action title="Select" onAction={() => handleItemAction(item.SRC, item.DST)} />
                </ActionPanel>
            }
        />
      ))}
    </List>
  );
}       
