import { 
  Color,
  Icon, 
  ImageLike 
} from "@raycast/api"

interface Constants {
  ChangesDetected: ImageLike
  ClearFilter: ImageLike
  ConfirmChange: ImageLike
  LocalSourceCode: ImageLike
  Install: ImageLike
  Installed: ImageLike
  Languages: ImageLike
  NeedSetup: ImageLike
  Readme: ImageLike
  Setup: ImageLike
  SourceCode: ImageLike
  Type: ImageLike
  Uninstall: ImageLike
}

export const IconConstants: Constants = {
  ChangesDetected: { 
    source: Icon.Checkmark, 
    tintColor: Color.Orange
  },
  ClearFilter: {
    source: Icon.XmarkCircle,
    tintColor: Color.Red
  },
  ConfirmChange: Icon.TextDocument,
  LocalSourceCode: Icon.Pencil,
  Install: Icon.Download,
  Installed: {
    source: Icon.Checkmark,
    tintColor: Color.Green
  },
  Languages: {
    source: Icon.Hammer
  },
  NeedSetup: {
    source: Icon.Gear,
    tintColor: Color.Orange
  },
  Readme: Icon.TextDocument,
  Setup: Icon.Pencil,
  SourceCode: Icon.TextDocument,
  Type: {
    source: Icon.Terminal
  },
  Uninstall: { 
    source: Icon.XmarkCircle, 
    tintColor: Color.Red 
  },
}