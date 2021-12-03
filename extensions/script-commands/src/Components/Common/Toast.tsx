import { 
  showToast, 
  ToastStyle,
  Toast
} from "@raycast/api"

import { 
  ScriptCommand 
} from "@models"

import { 
  State,
  Progress 
} from "@types"

export async function StoreToast(
    state: State, 
    progress: Progress, 
    scriptCommand: ScriptCommand 
  ): Promise<Toast> {

  let title = ""
  let message: string = scriptCommand.title
  let style = ToastStyle.Animated

  switch (state) {
  case (State.Installed): 
    {  
      if (progress == Progress.InProgress) {
        title = "Uninstalling Script Command..."
        style = ToastStyle.Animated
      }
      else {
        title = "Script Command uninstalled!"
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
        title = "Script Command installed!"
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

  case (State.ChangesDetected): 
    {
      title = "Changes Detected!"
      message = "Looks like you've made changes on this Script Command which is a template.\nPress Return to confirm and activate it."
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

  return showToast(style, title, message)
}