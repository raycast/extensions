import { 
  showToast, 
  ToastStyle,
  Toast
} from "@raycast/api"

import { 
  ScriptCommand 
} from "@models"

import { 
  State 
} from "@managers"

export enum Progress {
  InProgress,
  Finished,
}

export async function StoreToast(
    state: State, 
    progress: Progress, 
    scriptCommand: ScriptCommand 
  ): Promise<Toast> {
  let title: string
  let message: string = scriptCommand.title
  let style: ToastStyle

  switch (state) {
  case (State.Installed): 
    {  
      if (progress == Progress.InProgress) {
        title = "Uninstalling Script Command..."
        style = ToastStyle.Animated
      }
      else {
        title = "Script Command installed!"
        style = ToastStyle.Success
      }
    }
    break
    
    case (State.NotInstalled): 
    {
      if (progress == Progress.InProgress) {
        title = "Installing Script Command..."
        style = ToastStyle.Animated
      }
      else {
        title = "Script Command uninstalled!"
        style = ToastStyle.Success
      }
    }
    break

  case (State.NeedSetup): 
    {
      title = "Extra setup needed!"
      message = "You need to edit the Script Command before use"
      style = ToastStyle.Success
    }
    break
  case (State.Error): 
    {
      title = "Error 😔"
      message = "Something went wrong"
      style = ToastStyle.Failure
    }
    break
  }

  return showToast(style, title, message )
}