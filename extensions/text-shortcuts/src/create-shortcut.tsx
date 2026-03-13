import { Action, ActionPanel, Color, Form, Icon, LocalStorage, showToast, Toast, useNavigation } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { ActionOnTactions } from "./components/action-on-tactions";
import { ActionOpenPreferences } from "./components/action-open-preferences";
import { variables } from "./types/types";
import { shortcutTips } from "./util/constants";
import {
  cases,
  checkAffix,
  checkInfo,
  coders,
  createShortcut,
  iconColors,
  icons,
  Shortcut,
  ShortcutInfo,
  Taction,
  TactionType,
  tags,
  transforms,
} from "./util/shortcut";

export default function CreateShortcut(props: {
  shortcut: Shortcut | undefined;
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
}) {
  const _editShortcut = props.shortcut;
  const setRefresh =
    typeof props.setRefresh == "undefined"
      ? () => {
          return;
        }
      : props.setRefresh;
  const editShortcut = typeof _editShortcut == "undefined" ? new Shortcut() : _editShortcut;
  const isEdit = typeof _editShortcut != "undefined";
  const [localShortcuts, setLocalShortcuts] = useState<Shortcut[]>([]);
  const [info, setInfo] = useState<ShortcutInfo>(editShortcut.info);
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
      navigationTitle={isEdit ? "Edit Text Shortcut" : "Create Text Shortcut"}
      actions={
        <CreateShortcutActions
          isEdit={isEdit}
          info={info}
          tactions={tactions}
          localShortcuts={localShortcuts}
          setTactions={setTactions}
          setRefresh={setRefresh}
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
        id={"icon"}
        title={"Icon"}
        value={info.icon}
        onChange={(newValue) => {
          const _info = { ...info };
          _info.icon = newValue as Icon;
          setInfo(_info);
        }}
      >
        {icons.map((value) => {
          return (
            <Form.Dropdown.Item
              key={value[0]}
              title={value[0]}
              icon={{ source: value[1] as Icon, tintColor: info.iconColor }}
              value={value[1]}
            />
          );
        })}
      </Form.Dropdown>
      <Form.Dropdown
        id={"iconColor"}
        title={"Color"}
        value={info.iconColor}
        onChange={(newValue) => {
          const _info = { ...info };
          _info.iconColor = newValue as Color;
          setInfo(_info);
        }}
      >
        {iconColors.map((value) => {
          return (
            <Form.Dropdown.Item
              key={value[0]}
              title={value[0]}
              icon={{ source: Icon.CircleFilled, tintColor: value[1] as Color }}
              value={value[1] + ""}
            />
          );
        })}
      </Form.Dropdown>

      <Form.TagPicker
        id={"tags"}
        title={"Tag"}
        value={info.tag}
        placeholder={"Shortcut tags"}
        onChange={(newValue) => {
          const _info = { ...info };
          _info.tag = newValue;
          setInfo(_info);
        }}
      >
        {tags.map((value) => {
          return <Form.TagPicker.Item key={value} title={value} icon={Icon.Hashtag} value={value} />;
        })}
      </Form.TagPicker>

      {tactionForms(tactions, setTactions)}

      <Form.Description text={shortcutTips.key} />
      <Form.Description text={shortcutTips.action} />
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
  isEdit: boolean;
  info: ShortcutInfo;
  tactions: Taction[];
  setTactions: React.Dispatch<React.SetStateAction<Taction[]>>;
  localShortcuts: Shortcut[];
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { isEdit, info, tactions, setTactions, localShortcuts, setRefresh } = props;
  const { pop } = useNavigation();
  return (
    <ActionPanel>
      <Action
        title={isEdit ? "Update Shortcut" : "Create Shortcut"}
        icon={isEdit ? Icon.RotateClockwise : Icon.PlusCircle}
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
              `Check action${_checkInfo.tactionContentValid.actionIndex}.`,
            );
          } else if (!_checkAffix.valid) {
            await showToast(
              Toast.Style.Failure,
              `Affix has more than one "Input" variable.`,
              `Check action${_checkAffix.affixIndex}.`,
            );
          } else {
            await createShortcut(info, tactions, localShortcuts);
            pop();
            setRefresh(Date.now());
            await showToast(Toast.Style.Success, `Create shortcut success!`);
          }
        }}
      />
      <ActionOnTactions tactions={tactions} setTactions={setTactions} />

      <ActionOpenPreferences />
    </ActionPanel>
  );
}

function updateTactionContent(
  content: string,
  index: number,
  taction: Taction[],
  setTactions: React.Dispatch<React.SetStateAction<Taction[]>>,
  contentIndex = 0,
) {
  taction[index].content[contentIndex] = content;
  setTactions(taction);
}
