import { useEffect, useState } from "react";
import { environment, showToast, Action, ActionPanel, List } from "@raycast/api";
import { exec } from "child_process";
import fs from "fs";
import os from "os";

const currentUser = os.userInfo().username;
const basePath = `/Users/${currentUser}/Library/Mobile Documents/`;

const PagesDocsPath = `${basePath}com~apple~Pages/Documents/`;
const NumberesDocsPath = `${basePath}com~apple~Numbers/Documents/`;
const KeynoteDocsPath = `${basePath}com~apple~Keynote/Documents/`;
const TextEditDocsPath = `${basePath}com~apple~TextEdit/Documents/`;
const ScriptEditDocsPath = `${basePath}com~apple~ScriptEditor2/Documents/`;

const readFilesFromDirectory = (path: string) => {
  const files = fs.readdirSync(path);
  const keynoteFiles = files
    .filter((file) => !file.startsWith(".") && file.endsWith(".key")) // Filter out hidden files and include only .key files
    .map((file) => ({
      title: file.replace(/\.[^/.]+$/, ""),
      keywords: [file.replace(/\.[^/.]+$/, "")],
      icon: `${environment.assetsPath}/keynote_icon.png`,
      pfad: `${KeynoteDocsPath}${file}`,
    }));
  const pagesFiles = files
    .filter((file) => !file.startsWith(".") && file.endsWith(".pages")) // Filter out hidden files and include only .pages files
    .map((file) => ({
      title: file.replace(/\.[^/.]+$/, ""),
      keywords: [file.replace(/\.[^/.]+$/, "")],
      icon: `${environment.assetsPath}/pages_icon.png`,
      pfad: `${PagesDocsPath}${file}`,
    }));
  const numbersFiles = files
    .filter((file) => !file.startsWith(".") && file.endsWith(".numbers")) // Filter out hidden files and include only .numbers files
    .map((file) => ({
      title: file.replace(/\.[^/.]+$/, ""),
      keywords: [file.replace(/\.[^/.]+$/, "")],
      icon: `${environment.assetsPath}/numbers_icon.png`,
      pfad: `${NumberesDocsPath}${file}`,
    }));
  const scriptsFiles = files
    .filter((file) => !file.startsWith(".") && file.endsWith(".scpt")) // Filter out hidden files and include only .scpt files
    .map((file) => ({
      title: file.replace(/\.[^/.]+$/, ""),
      keywords: [file.replace(/\.[^/.]+$/, "")],
      icon: `${environment.assetsPath}/scriptedit_icon.png`,
      pfad: `${ScriptEditDocsPath}${file}`,
    }));
  const textsFiles = files
    .filter((file) => !file.startsWith(".") && file.endsWith(".rtf")) // Filter out hidden files and include only .rtf files
    .map((file) => ({
      title: file.replace(/\.[^/.]+$/, ""),
      keywords: [file.replace(/\.[^/.]+$/, "")],
      icon: `${environment.assetsPath}/textedit_icon.png`,
      pfad: `${TextEditDocsPath}${file}`,
    }));
  return { keynoteFiles, pagesFiles, numbersFiles, scriptsFiles, textsFiles };
};

export default function Command(): JSX.Element {
  const [searchText, setSearchText] = useState("");

  const { keynoteFiles, pagesFiles, numbersFiles, scriptsFiles, textsFiles } = {
    keynoteFiles: readFilesFromDirectory(KeynoteDocsPath).keynoteFiles,
    pagesFiles: readFilesFromDirectory(PagesDocsPath).pagesFiles,
    numbersFiles: readFilesFromDirectory(NumberesDocsPath).numbersFiles,
    scriptsFiles: readFilesFromDirectory(ScriptEditDocsPath).scriptsFiles,
    textsFiles: readFilesFromDirectory(TextEditDocsPath).textsFiles,
  };
  const allFiles = [
    { title: "Keynotes", children: keynoteFiles },
    { title: "Pages", children: pagesFiles },
    { title: "Numbers", children: numbersFiles },
    { title: "Scripts", children: scriptsFiles },
    { title: "Texts", children: textsFiles },
  ];
  const [filteredList, filterList] = useState(allFiles);

  useEffect(() => {
    const filteredFiles = allFiles.map((category) => ({
      title: category.title,
      children: category.children.filter((item) => {
        const keywordMatches = item.keywords.some((keyword) =>
          keyword.toLowerCase().includes(searchText.toLowerCase())
        );
        return keywordMatches;
      }),
    }));
    filterList(filteredFiles);
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
      console.log("Datei erfolgreich geöffnet.");
    });
  }

  const handleItemAction = (pfad: string) => {
    terminalBefehlausführen(`open "${pfad}"`);
  };

  function deleteFile(filePath: string): void {
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(err);
        return;
      }
      console.log(`File ${filePath} has been deleted`);
      // Lade die Liste neu, nachdem die Datei gelöscht wurde
      const { keynoteFiles, pagesFiles, numbersFiles, scriptsFiles, textsFiles } = {
        keynoteFiles: readFilesFromDirectory(KeynoteDocsPath).keynoteFiles,
        pagesFiles: readFilesFromDirectory(PagesDocsPath).pagesFiles,
        numbersFiles: readFilesFromDirectory(NumberesDocsPath).numbersFiles,
        scriptsFiles: readFilesFromDirectory(ScriptEditDocsPath).scriptsFiles,
        textsFiles: readFilesFromDirectory(TextEditDocsPath).textsFiles,
      };
      const updatedFiles = [
        { title: "Keynotes", children: keynoteFiles },
        { title: "Pages", children: pagesFiles },
        { title: "Numbers", children: numbersFiles },
        { title: "Scripts", children: scriptsFiles },
        { title: "Texts", children: textsFiles },
      ];
      filterList(updatedFiles);
      showToast({ title: "Gelöscht", message: "Erfolgreich gelöscht." });
    });
  }

  return (
    <List
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Search Files"
      searchBarPlaceholder="Search your files"
    >
      {filteredList.map((category) => (
        <List.Section key={category.title} title={category.title}>
          {category.children.map((item) => (
            <List.Item
              title={item.title}
              key={item.title}
              icon={item.icon}
              actions={
                <ActionPanel>
                  <Action title="Auswählen" onAction={() => handleItemAction(item.pfad)} />
                  <Action
                    title="Löschen"
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => deleteFile(item.pfad)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
