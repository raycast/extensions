import { PersonalShare } from "./SketchPersonalShare";
<<<<<<< HEAD
import { Project, Share } from "./SketchWorkspaceShare";
=======
import { Share } from "./SketchWorkspaceShare";
>>>>>>> 03c01420ef3b43e9aa6fbbd48100f74091d333f5

export interface Preferences {
  email: string;
  password: string;
}

export interface SelectedWorkspace {
  identifier: string;
  name: string;
}

export interface StoredCachedData {
  identifier: string;
  shares: Share[] | PersonalShare[];
<<<<<<< HEAD
}

export interface StoredCachedProjctes {
  identifier: string;
  projects: Project[];
=======
>>>>>>> 03c01420ef3b43e9aa6fbbd48100f74091d333f5
}