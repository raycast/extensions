import React, { useState } from "react";
import {
  LaunchProps,
  Icon,
  List,
  Clipboard,
  Action,
  ActionPanel,
  showToast,
  Toast,
  getPreferenceValues,
  openCommandPreferences,
  Color,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import generatePassword, { PasswordOptions, WordListType } from "./generatePassword";
import { en } from "./translations";

interface PasswordArguments {
  wordCount?: string;
  passwordCount?: string;
  separator?: string;
}

export default function Command(props: LaunchProps<{ arguments: PasswordArguments }>) {
  const preferences = getPreferenceValues<Preferences>();

  const [selectedWordList, setSelectedWordList] = useState<WordListType>(preferences.wordList);

  const parseNumber = (val: string | undefined, def: string) => {
    const n = parseInt(val ?? def, 10);
    return isNaN(n) ? parseInt(def, 10) : n;
  };

  const options: PasswordOptions = {
    wordCount: parseNumber(props.arguments.wordCount, preferences.defaultWordCount),
    passwordCount: parseNumber(props.arguments.passwordCount, preferences.defaultPasswordCount),
    separator: props.arguments.separator ?? preferences.separator,
    casing: preferences.casing,
    wordListType: selectedWordList,
    customPath: preferences.customWordListPath,
    useLeetSpeak: preferences.useLeetSpeak,
    prefix: preferences.prefix,
    suffix: preferences.suffix,
  };

  const {
    data = [],
    isLoading,
    revalidate,
  } = useCachedPromise((opts: PasswordOptions) => generatePassword(opts), [options], {
    keepPreviousData: true,
    onError: (err) => {
      void showToast(Toast.Style.Failure, err instanceof Error ? err.message : String(err));
    },
  });

  const getSourceIcon = (type: WordListType) => {
    switch (type) {
      case "oxford":
        return Icon.Book;
      case "idioms":
        return Icon.QuoteBlock;
      case "poetry":
        return Icon.Brush;
      case "tech":
        return Icon.Terminal;
      case "nature":
        return Icon.Leaf;
      case "custom":
        return Icon.Folder;
      default:
        return Icon.Key;
    }
  };

  const getStrengthColor = (strength: number): Color =>
    strength >= 4 ? Color.Green : strength >= 3 ? Color.Orange : Color.Red;

  const getStrengthLabel = (entropy: number) => {
    if (entropy >= 60) return en.strengthVeryStrong;
    if (entropy >= 40) return en.strengthStrong;
    if (entropy >= 25) return en.strengthModerate;
    return en.strengthWeak;
  };

  const handleCopy = async (text: string, type: "password" | "plaintext") => {
    await Clipboard.copy(text);
    void showToast(Toast.Style.Success, type === "password" ? en.passwordCopied : en.plaintextCopied);
  };

  const wordLists: { title: string; value: WordListType }[] = [
    { title: en.oxford, value: "oxford" },
    { title: en.idioms, value: "idioms" },
    { title: en.poetry, value: "poetry" },
    { title: en.tech, value: "tech" },
    { title: en.nature, value: "nature" },
    { title: en.custom, value: "custom" },
  ];

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder={en.searchPlaceholder}
      searchBarAccessory={
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (
          <List.Dropdown
            tooltip={en.wordListDropdownTitle}
            value={selectedWordList}
            onChange={(v) => setSelectedWordList(v as WordListType)}
          >
            {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              wordLists.map((w) => (
                <List.Dropdown.Item key={w.value} title={w.title} value={w.value} icon={getSourceIcon(w.value)} />
              )) as any
            }
          </List.Dropdown>
        ) as any
      }
    >
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (
          <List.Section title={en.results} subtitle={en.itemsCount.replace("{count}", String(data.length))}>
            {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              data.map((p, index) => {
                const words = p.plaintext.split(" ");
                const color = getStrengthColor(p.strength);
                const label = getStrengthLabel(p.entropy);

                return (
                  <List.Item
                    key={`${p.password}-${index}`}
                    title={p.password}
                    icon={{ source: getSourceIcon(selectedWordList), tintColor: color }}
                    keywords={[...words, p.plaintext]}
                    accessories={[
                      {
                        text: { value: `${Math.round(p.entropy)} bits`, color },
                        icon: {
                          source: p.strength >= 3 ? Icon.CheckCircle : Icon.Circle,
                          tintColor: color,
                        },
                        tooltip: label,
                      },
                    ]}
                    detail={
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      (
                        <List.Item.Detail
                          markdown={`### ${en.componentsLabel}\n${words.map((w: string) => `\`${w}\``).join("  •  ")}`}
                          metadata={
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            (
                              <List.Item.Detail.Metadata
                                children={
                                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                  (
                                    <>
                                      <List.Item.Detail.Metadata.TagList
                                        title={en.strengthLabel}
                                        children={
                                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                          (<List.Item.Detail.Metadata.TagList.Item text={label} color={color} />) as any
                                        }
                                      />
                                      <List.Item.Detail.Metadata.Separator />
                                      <List.Item.Detail.Metadata.Label
                                        title={en.wordCount}
                                        text={String(words.length)}
                                      />
                                      <List.Item.Detail.Metadata.Label
                                        title={en.totalLength}
                                        text={String(p.password.length)}
                                      />
                                      <List.Item.Detail.Metadata.Label
                                        title={en.entropy}
                                        text={`${Math.round(p.entropy)} bits`}
                                      />
                                    </>
                                  ) as any
                                }
                              />
                            ) as any
                          }
                        />
                      ) as any
                    }
                    actions={
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      (
                        <ActionPanel
                          children={
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            (
                              <>
                                <ActionPanel.Section
                                  title={en.copyActions}
                                  children={
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    (
                                      <>
                                        <Action.CopyToClipboard
                                          title={en.copyPassword}
                                          content={p.password}
                                          onCopy={() => handleCopy(p.password, "password")}
                                        />
                                        <Action.CopyToClipboard
                                          title={en.copyPlaintext}
                                          content={p.plaintext}
                                          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                                          onCopy={() => handleCopy(p.plaintext, "plaintext")}
                                        />
                                      </>
                                    ) as any
                                  }
                                />

                                <ActionPanel.Section
                                  title={en.generationActions}
                                  children={
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    (
                                      <Action
                                        title={en.regenerate}
                                        icon={Icon.RotateAntiClockwise}
                                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                                        onAction={revalidate}
                                      />
                                    ) as any
                                  }
                                />

                                <ActionPanel.Section
                                  title={en.systemActions}
                                  children={
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    (
                                      <Action
                                        title={en.openPreferences}
                                        icon={Icon.Gear}
                                        shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                                        onAction={openCommandPreferences}
                                      />
                                    ) as any
                                  }
                                />
                              </>
                            ) as any
                          }
                        />
                      ) as any
                    }
                  />
                );
              }) as any
            }
          </List.Section>
        ) as any
      }
    </List>
  );
}
