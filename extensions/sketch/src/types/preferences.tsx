import { PersonalShare } from "./SketchPersonalShare";
import { Project, Share } from "./SketchWorkspaceShare";

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
}

export interface StoredCachedProjctes {
  identifier: string;
  projects: Project[];
}
