import { Color } from "@raycast/api";

export default class DockerContainer {
  ID: string;
  State: string;
  Project: string;
  Names: string;
  WorkingDir: string;

  constructor(ID = "", State = "", Project = "", Names = "", WorkingDir = "") {
    this.ID = ID;
    this.State = State;
    this.Project = Project;
    this.Names = Names;
    this.WorkingDir = WorkingDir;
  }

  get IconColor(): string {
    switch (this.State) {
      case "running":
        return Color.Green;

        break;
      case "created":
        return Color.Blue;

        break;
      case "restarting":
      case "removing":
      case "paused":
        return Color.Orange;

        break;
      default:
        return "#eee";
        break;
    }
  }

  get getTitle(): string {
    return this.Names;
  }

  get isComplete(): boolean {
    return this.ID !== "" && this.State !== "" && this.Project !== "";
  }

  get isRunning(): boolean {
    return this.State === "running";
  }
}
