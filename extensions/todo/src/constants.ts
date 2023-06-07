import { Color, environment, Icon } from "@raycast/api";

export const todo_icons= {
  urgent: { source: Icon.Alarm, tintColor: Color.Red },
  important: { source: Icon.Important, tintColor: Color.Yellow },
  quick:{ source: Icon.Bolt, tintColor: Color.Green }
}

const gray=  {
    light: "999999",
    dark: "444444",
    adjustContrast: true,
}

export const gray_todo_icons= {
  urgent: { ...todo_icons.urgent, tintColor: gray },
  important: {...todo_icons.important, tintColor: gray },
  quick:{ ...todo_icons.quick, tintColor: gray }
}

export const IQU_STORAGE_KEY = "IQU_TODO_LIST";
export const IQU_STORAGE_KEY_DONE = "IQU_DONE_LIST";

export const BACKUP_PATH = environment.supportPath

