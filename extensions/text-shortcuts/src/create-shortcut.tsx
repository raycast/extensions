import React, { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Form,
  Icon,
  LocalStorage,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import {
  cases,
  checkAffix,
  checkInfo,
  coders,
  createShortcut,
  icons,
  Shortcut,
  ShortcutInfo,
  ShortcutSource,
  Taction,
  TactionType,
  tags,
  transforms,
} from "./util/shortcut";
import { variables } from "./util/variable";

export default function CreateShortcut(props: {
  shortcut: Shortcut | undefined;
  updateListUseState: [number[], React.Dispatch<React.SetStateAction<number[]>>];
}) {
  const _editShortcut = props.shortcut;
  const [updateList, setUpdateList] =
    typeof props.updateListUseState == "undefined" ? useState<number[]>([0]) : props.updateListUseState;
  const editShortcut = typeof _editShortcut == "undefined" ? new Shortcut() : _editShortcut;
  const [localShortcuts, setLocalShortcuts] = useState<Shortcut[]>([]);
  const [info, setInfo] = useState<ShortcutInfo>({
    name: "",
    id: "",
    icon: icons[0],
    source: ShortcutSource.USER,
    visibility: true,
    tag: [],
  });
  const [tactions, setTactions] = useState<Taction[]>([]);

  useEffect(() => {
    async function _fetchLocalShortcut() {
      setInfo(editShortcut.info);
      setTactions(editShortcut.tactions);
      const _localShortcut = await LocalStorage.getItem<string>("shortcuts");
      if (typeof _localShortcut == "string") {
        setLocalShortcuts(JSON.parse(_localShortcut));
      }
    }

    _fetchLocalShortcut().then();
  }, []);

  return (
    <Form
      navigationTitle={"Create Text Shortcut"}
      actions={
        <CreateShortcutActions
          info={info}
          tactions={tactions}
          localShortcuts={localShortcuts}
          setTactions={setTactions}
          updateListUseState={[updateList, setUpdateList]}
        />
      }
    >
      <Form.TextField
        id={"name"}
        title={"Name"}
        defaultValue={editShortcut.info.name}
        placeholder={"Shortcut name"}
        onChange={(newValue) => {
          info.name = newValue;
          setInfo(info);
        }}
      />
      <Form.Dropdown
        id={"icons"}
        title={"Icon"}
        defaultValue={editShortcut.info.icon}
        onChange={(newValue) => {
          info.icon = newValue as Icon;
          setInfo(info);
        }}
      >
        {icons.map((value) => {
          return <Form.Dropdown.Item key={value} title={" "} icon={value} value={value} />;
        })}
      </Form.Dropdown>

      <Form.TagPicker
        id={"tags"}
        title={"Tag"}
        defaultValue={editShortcut.info.tag}
        placeholder={"Shortcut tags"}
        onChange={(newValue) => {
          info.tag = newValue;
          setInfo(info);
        }}
      >
        {tags.map((value) => {
          return <Form.TagPicker.Item key={value} title={value} icon={Icon.Pin} value={value} />;
        })}
      </Form.TagPicker>

      {tactionForms(tactions, setTactions)}

      <Form.Description text={"  ⌘D       ⌘E       ⌘N        ⌘R            ⌘T              ⌘L"} />
      <Form.Description text={"Delete | Coder | Case | Replace | Transform | Template"} />
    </Form>
  );
}

export function tactionForms(tactions: Taction[], setTactions: React.Dispatch<React.SetStateAction<Taction[]>>) {
  return tactions.map((taction, index, array) => {
    switch (taction.type) {
      case TactionType.DELETE: {
        return (
          <React.Fragment key={"delete_fragment" + index}>
            <Form.Separator />
            <Form.TextField
              id={"delete" + index}
              key={"delete" + index}
              title={TactionType.DELETE + " " + (index + 1)}
              placeholder={"Strings or Regular Expressions"}
              info={
                "Support regular expressions with // and modifiers.\n" +
                "Delete all numbers: /\\d/g\n" +
                "Delete all Blank characters: /\\s/g\n" +
                "Delete all letter, number and underline: /\\w/g"
              }
              value={array[index].content[0]}
              onChange={(newValue) => {
                const _tactions = [...tactions];
                _tactions[index].content[0] = newValue;
                setTactions(_tactions);
              }}
            />
          </React.Fragment>
        );
      }
      case TactionType.REPLACE: {
        return (
          <React.Fragment key={"replace_fragment" + index}>
            <Form.Separator />
            <Form.TextField
              id={"replace" + index}
              key={"replace" + index}
              title={TactionType.REPLACE + " " + (index + 1)}
              placeholder={"Strings or Regular Expressions"}
              info={
                "Support regular expressions with // and modifiers.\n" +
                "Replace all numbers: /\\d/g\n" +
                "Replace all Blank characters: /\\s/g\n" +
                "Replace all letter, number and underline: /\\w/g"
              }
              value={array[index].content[0]}
              onChange={(newValue) => {
                const _tactions = [...tactions];
                _tactions[index].content[0] = newValue;
                setTactions(_tactions);
              }}
            />
            <Form.TextField
              id={"replace_with" + index}
              key={"replace_with" + index}
              title={""}
              placeholder={"with string"}
              value={array[index].content[1]}
              onChange={(newValue) => {
                const _tactions = [...tactions];
                _tactions[index].content[1] = newValue;
                setTactions(_tactions);
              }}
            />
          </React.Fragment>
        );
      }
      case TactionType.AFFIX: {
        return (
          <React.Fragment key={"affix_fragment" + index}>
            <Form.Separator />
            <Form.TextArea
              id={"affix" + index}
              key={"affix" + index}
              title={TactionType.AFFIX + " " + (index + 1)}
              value={array[index].content[0]}
              placeholder={'Such as Prefix$VARIABLE$Suffix\n\nTemplate can only have a maximum of one "Input" variable'}
              onChange={(newValue) => {
                updateTactionContent(newValue, index, [...array], setTactions);
              }}
            />
            <Form.Dropdown
              id={"affix_variable" + index}
              key={"affix_variable" + index}
              defaultValue={""}
              onChange={async (newValue) => {
                updateTactionContent(`${tactions[index].content[0]}${newValue}`, index, [...array], setTactions);
              }}
            >
              {variables.map((variable) => {
                return (
                  <Form.Dropdown.Item key={"variable" + variable.title} title={variable.title} value={variable.value} />
                );
              })}
            </Form.Dropdown>
          </React.Fragment>
        );
      }
      case TactionType.CASE: {
        return (
          <React.Fragment key={"case_fragment" + index}>
            <Form.Separator />
            <Form.Dropdown
              id={"case" + index}
              key={"case" + index}
              title={TactionType.CASE + " " + (index + 1)}
              defaultValue={array[index].content[0]}
              onChange={async (newValue) => {
                updateTactionContent(newValue, index, [...array], setTactions);
              }}
            >
              {cases.map((cases, caseIndex) => {
                return <Form.Dropdown.Item key={"case" + caseIndex} title={cases} value={cases} />;
              })}
            </Form.Dropdown>
          </React.Fragment>
        );
      }
      case TactionType.CODER: {
        return (
          <React.Fragment key={"coder_fragment" + index}>
            <Form.Separator />
            <Form.Dropdown
              id={"coder" + index}
              key={"coder" + index}
              title={TactionType.CODER + " " + (index + 1)}
              defaultValue={array[index].content[0]}
              onChange={async (newValue) => {
                updateTactionContent(newValue, index, [...array], setTactions);
              }}
            >
              {coders.map((coder) => {
                return <Form.Dropdown.Item key={"coder" + coder} title={coder} value={coder} />;
              })}
            </Form.Dropdown>
          </React.Fragment>
        );
      }
      case TactionType.TRANSFORM: {
        return (
          <React.Fragment key={"transform_fragment" + index}>
            <Form.Separator />
            <Form.Dropdown
              id={"transform" + index}
              key={"transform" + index}
              title={TactionType.TRANSFORM + " " + (index + 1)}
              defaultValue={array[index].content[0]}
              onChange={async (newValue) => {
                updateTactionContent(newValue, index, [...array], setTactions);
              }}
            >
              {transforms.map((transform) => {
                return <Form.Dropdown.Item key={"convert" + transform} title={transform} value={transform} />;
              })}
            </Form.Dropdown>
          </React.Fragment>
        );
      }
    }
  });
}

function CreateShortcutActions(props: {
  info: ShortcutInfo;
  tactions: Taction[];
  localShortcuts: Shortcut[];
  setTactions: React.Dispatch<React.SetStateAction<Taction[]>>;
  updateListUseState: [number[], React.Dispatch<React.SetStateAction<number[]>>];
}) {
  const info = props.info;
  const tactions = props.tactions;
  const localShortcuts = props.localShortcuts;
  const setTactions = props.setTactions;
  const [updateList, setUpdateList] = props.updateListUseState;
  const { pop } = useNavigation();
  return (
    <ActionPanel>
      <Action
        title="Create Shortcut"
        icon={Icon.Download}
        onAction={async () => {
          const _checkInfo = checkInfo(info.name, tactions);
          const _checkAffix = checkAffix(tactions);
          if (!_checkInfo.nameValid) {
            await showToast(Toast.Style.Failure, `Shortcut name can't be empty.`);
          } else if (!_checkInfo.tactionCountValid) {
            await showToast(Toast.Style.Failure, `Shortcut requires at least one action.`);
          } else if (!_checkInfo.tactionContentValid.valid) {
            await showToast(
              Toast.Style.Failure,
              `Shortcut has empty actions.`,
              `Check action${_checkInfo.tactionContentValid.actionIndex}.`
            );
          } else if (!_checkAffix.valid) {
            await showToast(
              Toast.Style.Failure,
              `Affix has more than one "Input" variable.`,
              `Check action${_checkAffix.affixIndex}.`
            );
          } else {
            await createShortcut(info, tactions, localShortcuts);
            pop();
            const _updateList = [...updateList];
            _updateList[0]++;
            setUpdateList(_updateList);
            await showToast(Toast.Style.Success, `Create shortcut success!`);
          }
        }}
      />
      <TactionActions tactions={tactions} setTactions={setTactions} />

      <ActionPanel.Section>
        <Action
          icon={Icon.Gear}
          title="Open Extension Preferences"
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={openExtensionPreferences}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export function TactionActions(props: {
  tactions: Taction[];
  setTactions: React.Dispatch<React.SetStateAction<Taction[]>>;
}) {
  const tactions = props.tactions;
  const setTactions = props.setTactions;
  return (
    <>
      <ActionPanel.Section title="Add Action">
        <Action
          title={TactionType.DELETE}
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
          onAction={async () => {
            setTactions([...tactions, { type: TactionType.DELETE, content: [""] }]);
          }}
        />
        <Action
          title={TactionType.CODER}
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          onAction={async () => {
            setTactions([...tactions, { type: TactionType.CODER, content: [""] }]);
          }}
        />
        <Action
          title={TactionType.CASE}
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          onAction={async () => {
            setTactions([...tactions, { type: TactionType.CASE, content: [""] }]);
          }}
        />
        <Action
          title={TactionType.REPLACE}
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={async () => {
            setTactions([...tactions, { type: TactionType.REPLACE, content: [""] }]);
          }}
        />
        <Action
          title={TactionType.TRANSFORM}
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "t" }}
          onAction={async () => {
            setTactions([...tactions, { type: TactionType.TRANSFORM, content: [""] }]);
          }}
        />
        <Action
          title={TactionType.AFFIX}
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "l" }}
          onAction={async () => {
            setTactions([...tactions, { type: TactionType.AFFIX, content: [""] }]);
          }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Remove Action">
        <Action
          title="Remove Last Action"
          icon={Icon.Trash}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={async () => {
            const _tactions = [...tactions];
            _tactions.pop();
            setTactions(_tactions);
          }}
        />
        <Action
          title="Remove All Actions"
          icon={Icon.ExclamationMark}
          shortcut={{ modifiers: ["shift", "ctrl"], key: "x" }}
          onAction={async () => {
            setTactions([]);
          }}
        />
      </ActionPanel.Section>
    </>
  );
}

function updateTactionContent(content: string, index: number, taction: Taction[], setTactions: any, contentIndex = 0) {
  taction[index].content[contentIndex] = content;
  setTactions(taction);
}
